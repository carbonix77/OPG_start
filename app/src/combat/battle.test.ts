import { describe, expect, it } from "vitest";
import { meshIndexOf, previewForAsset } from "../inspector/previewConfig";
import { chooseEnemyAction } from "./ai";
import { BattleEngine, makeBalancedFiveVFive } from "./engine";
import { slotsForLineup } from "../battle/arena";
import {
  LINEUP_2V2_MIXED,
  LINEUP_2V2_STRAW_HAT,
  LINEUP_5V5_SYNTHETIC,
  SKINNED_BATTLE_ROSTER,
  buildRandom5v5Lineup,
  lineupToSpawns,
} from "./lineups";
import {
  FIXTURE_MANIFEST,
  LUFFY_MANIFEST,
  NAMI_MANIFEST,
  ROBIN_MANIFEST,
  SANJI_MANIFEST,
  SYNTHETIC_MANIFEST,
  USOPP_MANIFEST,
  ZORO_MANIFEST,
  primarySkills,
  skillOf,
} from "./manifests";
import { resolveModeForAction } from "./resolvePolicy";
import { MAX_GUARD_CHARGES } from "./types";

function duo(seed: number, dummyHp = 60) {
  return new BattleEngine(seed, [
    { id: "zoro", manifestId: "zoro-roster", team: "alpha", speed: 20 },
    { id: "dummy", manifestId: "synthetic-dummy", team: "bravo", speed: 1, maxHp: dummyHp },
  ]);
}

describe("BattleEngine", () => {
  it("uses a seeded initiative order", () => {
    const a = duo(7);
    const b = duo(7);
    expect(a.getState().order).toEqual(b.getState().order);
    expect(a.currentActorId()).toBe(a.getState().order[0]);
  });

  it("applies basic-attack damage exactly once at contact", () => {
    const engine = duo(1);
    expect(engine.currentActorId()).toBe("zoro");
    engine.beginAction("zoro", "basic", "dummy");
    const actionId = engine.currentActionId()!;
    const first = engine.applyContact(actionId);
    const again = engine.applyContact(actionId);
    expect(first.some((event) => event.type === "contact")).toBe(true);
    expect(again.some((event) => event.type === "blocked")).toBe(true);
    const dummy = engine.getState().units.find((unit) => unit.id === "dummy");
    const skill = skillOf(ZORO_MANIFEST, "basic");
    expect(dummy?.hp).toBe(60 - (skill?.damage ?? 0));
    engine.finishAction(actionId);
    expect(engine.getState().phase === "idle" || engine.getState().phase === "ended").toBe(true);
  });

  it("blocks invalid targets and dead actors", () => {
    const engine = duo(2, 18);
    expect(engine.canAct("zoro", "basic", "zoro").ok).toBe(false);
    engine.resolveFully("zoro", "basic", "dummy");
    expect(engine.getState().units.find((unit) => unit.id === "dummy")?.alive).toBe(false);
    expect(engine.getState().phase).toBe("ended");
    expect(engine.canAct("dummy", "dummy-poke", "zoro").ok).toBe(false);
  });

  it("keeps hp at zero and supports reset plus three sequential attacks", () => {
    const engine = duo(3, 100);
    for (let i = 0; i < 3; i += 1) {
      if (engine.currentActorId() !== "zoro") {
        engine.resolveFully("dummy", "dummy-poke", "zoro");
      }
      expect(engine.currentActorId()).toBe("zoro");
      engine.resolveFully("zoro", "basic", "dummy");
    }
    const dummy = engine.getState().units.find((unit) => unit.id === "dummy");
    expect(dummy?.hp).toBe(100 - 18 * 3);
    engine.reset(3);
    expect(engine.getState().units.find((unit) => unit.id === "dummy")?.hp).toBe(100);
    expect(engine.getState().phase).toBe("idle");
  });

  it("drives a non-Zoro fixture through action and idle data", () => {
    const engine = new BattleEngine(4, [
      { id: "fix", manifestId: "fixture-fighter", team: "alpha", speed: 20 },
      { id: "dummy", manifestId: "synthetic-dummy", team: "bravo", speed: 1 },
    ]);
    const events = engine.resolveFully("fix", "action-a", "dummy");
    expect(events.some((event) => event.type === "contact")).toBe(true);
    expect(FIXTURE_MANIFEST.idleClip).toBe("fixture-idle");
    expect(FIXTURE_MANIFEST.skills[0]?.clipId).toBe("fixture-action-a");
  });

  it("runs a headless 5v5 with ten synthetic units to a winner", () => {
    const engine = makeBalancedFiveVFive(9);
    expect(engine.getState().units).toHaveLength(10);
    let guard = 0;
    let guardUses = 0;
    while (engine.getState().phase !== "ended" && guard < 200) {
      guard += 1;
      const state = engine.getState();
      const actorId = engine.currentActorId();
      if (!actorId) break;
      const actor = state.units.find((unit) => unit.id === actorId);
      const target = state.units.find((unit) => unit.alive && unit.team !== actor?.team);
      if (!actor || !target) break;
      // Mix in Guard under low HP so the 5v5 path exercises the tactical layer.
      if (actor.hp / actor.maxHp <= 0.5 && actor.energy >= 1 && engine.canAct(actor.id, "guard", actor.id).ok && guard % 3 === 0) {
        engine.resolveFully(actor.id, "guard", actor.id);
        guardUses += 1;
        continue;
      }
      engine.resolveFully(actor.id, "action-a", target.id);
    }
    const ended = engine.getState();
    expect(ended.phase).toBe("ended");
    expect(ended.winner === "alpha" || ended.winner === "bravo").toBe(true);
    expect(ended.units.filter((unit) => unit.alive).every((unit) => unit.team === ended.winner)).toBe(true);
    expect(guardUses).toBeGreaterThan(0);
    expect(ended.log.some((event) => event.type === "contact" && event.guarded)).toBe(true);
  });

  it("builds the straw-hat 2v2 from the data-driven lineup helper", () => {
    const engine = new BattleEngine(21, lineupToSpawns(LINEUP_2V2_STRAW_HAT));
    expect(engine.getState().units.map((unit) => unit.id)).toEqual(["zoro", "sanji", "nami", "usopp"]);
    expect(engine.getState().units.filter((unit) => unit.team === "alpha")).toHaveLength(2);
    expect(engine.getState().units.filter((unit) => unit.team === "bravo")).toHaveLength(2);
  });

  it("aborts before contact without dealing damage", () => {
    const engine = duo(5);
    engine.beginAction("zoro", "basic", "dummy");
    const actionId = engine.currentActionId()!;
    const aborted = engine.abortAction("reset-before-contact", actionId);
    expect(aborted.some((event) => event.type === "action-aborted")).toBe(true);
    expect(engine.getState().units.find((unit) => unit.id === "dummy")?.hp).toBe(60);
    expect(engine.getState().phase).toBe("idle");
    expect(engine.currentActorId()).toBe("zoro");
  });

  it("ignores stale contact and finish after abort", () => {
    const engine = duo(6);
    engine.beginAction("zoro", "basic", "dummy");
    const actionId = engine.currentActionId()!;
    engine.abortAction("cancelled", actionId);
    expect(engine.applyContact(actionId).some((event) => event.type === "blocked")).toBe(true);
    expect(engine.finishAction(actionId).some((event) => event.type === "blocked")).toBe(true);
    expect(engine.getState().units.find((unit) => unit.id === "dummy")?.hp).toBe(60);
  });

  it("finishAction does not invent contact after a cancelled presentation", () => {
    const engine = duo(8);
    engine.beginAction("zoro", "basic", "dummy");
    const actionId = engine.currentActionId()!;
    const blocked = engine.finishAction(actionId);
    expect(blocked.some((event) => event.type === "blocked")).toBe(true);
    expect(engine.getState().units.find((unit) => unit.id === "dummy")?.hp).toBe(60);
    expect(engine.getState().phase).toBe("acting");
    engine.abortAction("missing-clip", actionId);
    expect(engine.getState().phase).toBe("idle");
  });

  it("rejects duplicate ids, bad timing, and missing teams", () => {
    expect(() =>
      new BattleEngine(1, [
        { id: "a", manifestId: "fixture-fighter", team: "alpha" },
        { id: "a", manifestId: "synthetic-dummy", team: "bravo" },
      ]),
    ).toThrow(/Duplicate/);
    expect(() =>
      new BattleEngine(1, [
        { id: "a", manifestId: "fixture-fighter", team: "alpha" },
        { id: "b", manifestId: "fixture-fighter", team: "alpha" },
      ]),
    ).toThrow(/Both teams/);
    expect(() =>
      new BattleEngine(1, [
        { id: "a", manifestId: "fixture-fighter", team: "alpha", maxHp: 0 },
        { id: "b", manifestId: "synthetic-dummy", team: "bravo" },
      ]),
    ).toThrow(/positive HP/);
  });

  it("skips dead units and ends when one team is gone", () => {
    const engine = new BattleEngine(10, [
      { id: "a0", manifestId: "fixture-fighter", team: "alpha", speed: 30, maxHp: 9 },
      { id: "a1", manifestId: "fixture-fighter", team: "alpha", speed: 5, maxHp: 9 },
      { id: "b0", manifestId: "fixture-fighter", team: "bravo", speed: 20, maxHp: 9 },
    ]);
    expect(engine.currentActorId()).toBe("a0");
    engine.resolveFully("a0", "action-a", "b0");
    expect(engine.getState().units.find((unit) => unit.id === "b0")?.alive).toBe(false);
    expect(engine.getState().phase).toBe("ended");
    expect(engine.getState().winner).toBe("alpha");
  });

  it("keeps Zoro and Sanji manifests independent in one engine", () => {
    const engine = new BattleEngine(17, [
      { id: "zoro", manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 20 },
      { id: "sanji", manifestId: SANJI_MANIFEST.id, team: "alpha", speed: 19 },
      { id: "enemy-a", manifestId: "synthetic-dummy", team: "bravo", speed: 1, maxHp: 80 },
      { id: "enemy-b", manifestId: "synthetic-dummy", team: "bravo", speed: 1, maxHp: 80 },
    ]);
    expect(engine.currentActorId()).toBe("zoro");
    engine.resolveFully("zoro", "basic", "enemy-a");
    if (engine.currentActorId() === "sanji") {
      engine.resolveFully("sanji", "basic", "enemy-b");
    }
    const enemyA = engine.getState().units.find((unit) => unit.id === "enemy-a");
    const enemyB = engine.getState().units.find((unit) => unit.id === "enemy-b");
    expect(enemyA && enemyA.hp < enemyA.maxHp).toBe(true);
    expect(SANJI_MANIFEST.idleClip).toBe("Idle");
    expect(SANJI_MANIFEST.skills[0]?.clipId).toBe("Attack");
    expect(skillOf(SANJI_MANIFEST, "special")?.followClips).toEqual([
      "Diable_Jambe_2",
      "Diable_Jambe_3",
      "Diable_Jambe_4",
    ]);
    expect(skillOf(SANJI_MANIFEST, "special-2")?.followClips).toEqual([
      "Party_Table_Kick_Course_2",
      "Party_Table_Kick_Course_3",
    ]);
    expect(SANJI_MANIFEST.assetId).toBe("glb-sanji");
    expect(previewForAsset("glb-sanji")?.idleClip).toBe("Idle");
    expect(previewForAsset("glb-sanji")?.excludedMeshNames?.some((n) => n.startsWith("model_0_submesh_"))).toBe(
      true,
    );
    expect(enemyB?.hp === 80 || (enemyB && enemyB.hp < enemyB.maxHp)).toBe(true);
  });

  it("lets Sanji act on a chosen target after Zoro without sharing skill ids", () => {
    const engine = new BattleEngine(3, [
      { id: "zoro", manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 30 },
      { id: "sanji", manifestId: SANJI_MANIFEST.id, team: "alpha", speed: 20 },
      { id: "enemy-a", manifestId: "synthetic-dummy", team: "bravo", speed: 1, maxHp: 100 },
      { id: "enemy-b", manifestId: "synthetic-dummy", team: "bravo", speed: 1, maxHp: 100 },
    ]);
    expect(engine.currentActorId()).toBe("zoro");
    engine.resolveFully("zoro", "basic", "enemy-a");
    expect(engine.currentActorId()).toBe("sanji");
    expect(engine.canAct("sanji", "basic", "enemy-b").ok).toBe(true);
    engine.resolveFully("sanji", "basic", "enemy-b");
    const enemyA = engine.getState().units.find((unit) => unit.id === "enemy-a")!;
    const enemyB = engine.getState().units.find((unit) => unit.id === "enemy-b")!;
    expect(enemyA.hp).toBe(100 - (skillOf(ZORO_MANIFEST, "basic")?.damage ?? 0));
    expect(enemyB.hp).toBe(100 - (skillOf(SANJI_MANIFEST, "basic")?.damage ?? 0));
  });

  it("reads battle-prefixed mesh indices and Sanji-local texture config", () => {
    expect(meshIndexOf("unit-zoro-Mesh_36")).toBe(36);
    expect(meshIndexOf("unit-sanji-model_0_submesh_8")).toBe(8);
    const sanji = previewForAsset("noesis-sanji");
    const zoro = previewForAsset("noesis-roster");
    const nami = previewForAsset("noesis-nami");
    const usopp = previewForAsset("noesis-usopp");
    expect(sanji?.textureDir).toBe("preview/textures/sanji");
    expect(zoro?.textureDir).toBe("preview/textures/zoro");
    expect(nami?.textureDir).toBe("preview/textures/nami");
    expect(usopp?.textureDir).toBe("preview/textures/usopp");
    expect(sanji?.textureDir).not.toBe(zoro?.textureDir);
    expect(nami?.textureDir).not.toBe(usopp?.textureDir);
    expect(sanji?.materialSlotByMesh?.[8]).toBe(8);
    expect(sanji?.materialSlotByMesh?.[10]).toBe(10); // Noesis-only 871-vert mesh → cloth, not face
    expect(sanji?.materialSlotByMesh?.[19]).toBe(21); // arms/hands → skin slot, not hair
    expect(sanji?.materialSlotByMesh?.[21]).toBe(19); // hair mesh → hair slot
    expect(sanji?.idleClip).toBe("Sanji_0000");
    expect(nami?.idleClip).toBe("Nami_0000");
    expect(usopp?.idleClip).toBe("Usopp_0000");
    expect(sanji?.excludedMeshIndices).toEqual([0, 5, 6, 7, 10, 12, 24]);
    expect(nami?.excludedMeshIndices).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 18, 20, 23]);
    expect(usopp?.excludedMeshIndices).toEqual([0, 4, 9, 10, 11, 12, 13, 14, 16, 17, 19, 20, 21, 24, 31, 33, 35]);
    // Hide preset stays the presentation default; Show All is a runtime override only.
    expect(sanji?.excludedMeshIndices.includes(10)).toBe(true);
  });

  it("runs Zoro+Sanji vs Nami+Usopp with independent clips", () => {
    const engine = new BattleEngine(9, [
      { id: "zoro", manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 30 },
      { id: "sanji", manifestId: SANJI_MANIFEST.id, team: "alpha", speed: 25 },
      { id: "nami", manifestId: NAMI_MANIFEST.id, team: "bravo", speed: 20 },
      { id: "usopp", manifestId: USOPP_MANIFEST.id, team: "bravo", speed: 15 },
    ]);
    expect(engine.currentActorId()).toBe("zoro");
    engine.resolveFully("zoro", "basic", "nami");
    expect(engine.currentActorId()).toBe("sanji");
    engine.resolveFully("sanji", "basic", "usopp");
    expect(engine.currentActorId()).toBe("nami");
    engine.resolveFully("nami", "basic", "zoro");
    expect(engine.currentActorId()).toBe("usopp");
    engine.resolveFully("usopp", "basic", "sanji");
    expect(NAMI_MANIFEST.idleClip).toBe("Idle");
    expect(NAMI_MANIFEST.assetId).toBe("glb-nami");
    expect(skillOf(NAMI_MANIFEST, "basic")?.clipId).toBe("Attack");
    expect(skillOf(NAMI_MANIFEST, "special")?.clipId).toBe("Thunderbolt_Tempo");
    expect(skillOf(NAMI_MANIFEST, "special-2")?.clipId).toBe("Cyclone_Tempo");
    expect(previewForAsset("glb-nami")?.idleClip).toBe("Idle");
    expect(USOPP_MANIFEST.idleClip).toBe("Idle");
    expect(USOPP_MANIFEST.assetId).toBe("glb-usopp");
    expect(skillOf(USOPP_MANIFEST, "basic")?.clipId).toBe("Attack");
    expect(skillOf(USOPP_MANIFEST, "special")?.clipId).toBe("Fire_Star");
    expect(skillOf(USOPP_MANIFEST, "special-2")?.clipId).toBe("Sunflower_Star");
    expect(previewForAsset("glb-usopp")?.idleClip).toBe("Idle");
    expect(primarySkills(USOPP_MANIFEST).map((skill) => skill.id)).toEqual([
      "basic",
      "special",
      "special-2",
    ]);
    expect(engine.getState().units.find((unit) => unit.id === "nami")!.hp).toBeLessThan(80);
  });

  it("supports selectable 2v2 targets and skips a defeated enemy", () => {
    const engine = new BattleEngine(15, [
      { id: "zoro", manifestId: "zoro-roster", team: "alpha", speed: 30 },
      { id: "ally", manifestId: "synthetic-dummy", team: "alpha", speed: 1, maxHp: 40 },
      { id: "enemy-a", manifestId: "synthetic-dummy", team: "bravo", speed: 2, maxHp: 18 },
      { id: "enemy-b", manifestId: "synthetic-dummy", team: "bravo", speed: 2, maxHp: 40 },
    ]);
    expect(engine.currentActorId()).toBe("zoro");
    engine.resolveFully("zoro", "basic", "enemy-a");
    expect(engine.getState().units.find((unit) => unit.id === "enemy-a")?.alive).toBe(false);
    expect(engine.canAct(engine.currentActorId() ?? "", "dummy-poke", "enemy-a").ok).toBe(false);
    let guard = 0;
    while (engine.getState().phase !== "ended" && guard < 20) {
      guard += 1;
      const actorId = engine.currentActorId();
      if (!actorId) break;
      const actor = engine.getState().units.find((unit) => unit.id === actorId);
      const target = engine
        .getState()
        .units.find((unit) => unit.alive && unit.team !== actor?.team && unit.id !== "enemy-a");
      if (!actor || !target) break;
      const skill = actor.manifestId === "zoro-roster" ? "basic" : "dummy-poke";
      engine.resolveFully(actor.id, skill, target.id);
    }
    expect(engine.getState().phase).toBe("ended");
  });

  it("replays the same 5v5 seed to the same winner and log length", () => {
    const run = (seed: number) => {
      const engine = makeBalancedFiveVFive(seed);
      let guard = 0;
      while (engine.getState().phase !== "ended" && guard < 200) {
        guard += 1;
        const actorId = engine.currentActorId();
        const state = engine.getState();
        const actor = state.units.find((unit) => unit.id === actorId);
        const target = state.units.find((unit) => unit.alive && unit.team !== actor?.team);
        if (!actor || !target) break;
        engine.resolveFully(actor.id, "action-a", target.id);
      }
      return engine.getState();
    };
    const a = run(42);
    const b = run(42);
    expect(a.winner).toBe(b.winner);
    expect(a.log.map((event) => event.type)).toEqual(b.log.map((event) => event.type));
  });

  it("gates specials on energy, gains from basic, refunds on pre-contact abort", () => {
    const engine = duo(11, 200);
    const zoro = () => engine.getState().units.find((unit) => unit.id === "zoro")!;
    expect(zoro().energy).toBe(1);
    expect(engine.canAct("zoro", "special", "dummy").ok).toBe(true);
    const before = zoro().energy;
    engine.beginAction("zoro", "special", "dummy");
    expect(zoro().energy).toBe(before - 1);
    const actionId = engine.currentActionId()!;
    engine.abortAction("test-refund", actionId);
    expect(zoro().energy).toBe(before);
    // Basic still gains energy.
    engine.resolveFully("zoro", "basic", "dummy");
    let guard = 0;
    while (engine.currentActorId() !== "zoro" && engine.getState().phase !== "ended" && guard < 8) {
      guard += 1;
      const actorId = engine.currentActorId();
      if (!actorId) break;
      engine.resolveFully(actorId, "dummy-poke", "zoro");
    }
    expect(zoro().energy).toBeGreaterThanOrEqual(2);
  });

  it("CPU uses a special when energy allows, else basic", () => {
    const withEnergy = new BattleEngine(9, [
      { id: "zoro", manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 5 },
      { id: "nami", manifestId: NAMI_MANIFEST.id, team: "bravo", speed: 30, startEnergy: 1 },
    ]);
    expect(withEnergy.currentActorId()).toBe("nami");
    const specialPick = chooseEnemyAction(withEnergy);
    expect(specialPick?.actorId).toBe("nami");
    expect(specialPick?.skillId === "special" || specialPick?.skillId === "special-2").toBe(true);
    expect(specialPick?.reason.startsWith("special-available")).toBe(true);

    const broke = new BattleEngine(9, [
      { id: "zoro", manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 5 },
      { id: "nami", manifestId: NAMI_MANIFEST.id, team: "bravo", speed: 30, startEnergy: 0 },
    ]);
    const basicPick = chooseEnemyAction(broke);
    expect(basicPick?.skillId).toBe("basic");
    expect(basicPick?.reason.startsWith("basic")).toBe(true);
  });

  it("replays seeded enemy decisions for Nami and Usopp", () => {
    const engine = new BattleEngine(9, [
      { id: "zoro", manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 5 },
      { id: "sanji", manifestId: SANJI_MANIFEST.id, team: "alpha", speed: 4 },
      { id: "nami", manifestId: NAMI_MANIFEST.id, team: "bravo", speed: 30 },
      { id: "usopp", manifestId: USOPP_MANIFEST.id, team: "bravo", speed: 25 },
    ]);
    expect(engine.currentActorId()).toBe("nami");
    const a = chooseEnemyAction(engine);
    const b = chooseEnemyAction(engine);
    expect(a).toEqual(b);
    expect(a?.actorId).toBe("nami");
    expect(a?.skillId === "special" || a?.skillId === "special-2").toBe(true);
    expect(a?.targetId === "zoro" || a?.targetId === "sanji").toBe(true);
    expect(primarySkills(NAMI_MANIFEST).map((skill) => skill.id)).toEqual([
      "basic",
      "special",
      "special-2",
    ]);
    expect(primarySkills(ZORO_MANIFEST).map((skill) => skill.id)).toEqual([
      "basic",
      "special",
      "special-2",
    ]);
    expect(skillOf(ZORO_MANIFEST, "special")?.label).toBe("Oni Giri");
    expect(skillOf(ZORO_MANIFEST, "special-2")?.label).toBe("Dragon Twister");
    expect(ZORO_MANIFEST.idleClip).toBe("Idle");
    expect(skillOf(ZORO_MANIFEST, "basic")?.clipId).toBe("Attack");
    expect(skillOf(ZORO_MANIFEST, "special")?.clipId).toBe("Onigiri");
    expect(skillOf(ZORO_MANIFEST, "special-2")?.clipId).toBe("Dragon_Twister");
    expect(skillOf(ZORO_MANIFEST, "asura")?.companionClips).toEqual(["Asura_Left", "Asura_right"]);
    expect(skillOf(ZORO_MANIFEST, "asura")).toBeTruthy();
    expect(previewForAsset("glb-zoro")?.phantoms).toEqual([
      { clip: "Asura_Left", offset: [0, 0, 0] },
      { clip: "Asura_right", offset: [0, 0, 0] },
    ]);
    expect(skillOf(ZORO_MANIFEST, "guard")?.clipId).toBe("Block");
    expect(ZORO_MANIFEST.deathClip).toBe("Death");
    expect(ZORO_MANIFEST.hitClip).toBe("Hit");
    expect(previewForAsset("glb-zoro")?.idleClip).toBe("Idle");
    expect(previewForAsset("glb-zoro")?.clipMeshOverrides?.Idle).toEqual({
      hide: ["Sword_Mouth"],
      show: ["Sword_Mouth_Holder"],
    });
    expect(previewForAsset("glb-zoro")?.clipMeshOverrides?.Onigiri).toEqual({
      hide: ["Sword_Mouth_Holder"],
      show: ["Sword_Mouth"],
    });
    expect(previewForAsset("glb-zoro")?.clipMeshOverrides?.Attack).toEqual({
      hide: ["Sword_Mouth"],
      show: ["Sword_Mouth_Holder"],
    });
    expect(previewForAsset("glb-zoro")?.clipMeshOverrides?.Dragon_Twister).toEqual({
      hide: ["Sword_Mouth_Holder"],
      show: ["Sword_Mouth"],
    });
    engine.resolveFully(a!.actorId, a!.skillId, a!.targetId);
    expect(engine.currentActorId()).toBe("usopp");
    const usopp = chooseEnemyAction(engine);
    expect(usopp?.actorId).toBe("usopp");
    engine.resolveFully(usopp!.actorId, usopp!.skillId, usopp!.targetId);
  });

  it("applies Guard to halve the next hit and preserves startEnergy on reset", () => {
    const engine = new BattleEngine(12, [
      { id: "zoro", manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 30, startEnergy: 4 },
      { id: "dummy", manifestId: "synthetic-dummy", team: "bravo", speed: 1, maxHp: 100 },
    ]);
    expect(engine.getState().units.find((unit) => unit.id === "zoro")!.energy).toBe(4);
    expect(engine.canAct("zoro", "guard", "zoro").ok).toBe(true);
    engine.resolveFully("zoro", "guard", "zoro");
    expect(engine.getState().units.find((unit) => unit.id === "zoro")!.guardCharges).toBe(1);
    // Dummy turn
    if (engine.currentActorId() === "dummy") {
      engine.resolveFully("dummy", "dummy-poke", "zoro");
    }
    const zoro = engine.getState().units.find((unit) => unit.id === "zoro")!;
    expect(zoro.hp).toBe(100 - Math.floor(5 * 0.5));
    expect(zoro.guardCharges).toBe(0);
    engine.reset(12);
    expect(engine.getState().units.find((unit) => unit.id === "zoro")!.energy).toBe(4);
    expect(engine.getState().units.find((unit) => unit.id === "zoro")!.guardCharges).toBe(0);
  });

  it("blocks specials at energy 0 and allows at 1+", () => {
    const engine = duo(13, 200);
    const zoro = () => engine.getState().units.find((unit) => unit.id === "zoro")!;
    expect(zoro().energy).toBe(1);
    expect(engine.canAct("zoro", "special", "dummy").ok).toBe(true);
    engine.beginAction("zoro", "special", "dummy");
    expect(zoro().energy).toBe(0);
    engine.abortAction("drain", engine.currentActionId()!);
    // Refund restores; spend without refund path: resolve a special then check 0 blocks
    engine.resolveFully("zoro", "special", "dummy");
    let guard = 0;
    while (engine.currentActorId() !== "zoro" && guard < 6) {
      guard += 1;
      const id = engine.currentActorId();
      if (!id) break;
      engine.resolveFully(id, "dummy-poke", "zoro");
    }
    if (zoro().energy < 1) {
      expect(engine.canAct("zoro", "special", "dummy").ok).toBe(false);
    }
  });

  it("plays a full 2v2 to a winner with specials when energy allows", () => {
    const engine = new BattleEngine(21, [
      { id: "zoro", manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 20, startEnergy: 5 },
      { id: "sanji", manifestId: SANJI_MANIFEST.id, team: "alpha", speed: 18, startEnergy: 5 },
      { id: "nami", manifestId: NAMI_MANIFEST.id, team: "bravo", speed: 12, maxHp: 80, startEnergy: 5 },
      { id: "usopp", manifestId: USOPP_MANIFEST.id, team: "bravo", speed: 10, maxHp: 75, startEnergy: 5 },
    ]);
    let guard = 0;
    while (engine.getState().phase !== "ended" && guard < 80) {
      guard += 1;
      const actorId = engine.currentActorId();
      if (!actorId) break;
      const actor = engine.getState().units.find((unit) => unit.id === actorId)!;
      if (actor.team === "bravo") {
        const decision = chooseEnemyAction(engine);
        if (!decision) break;
        engine.resolveFully(decision.actorId, decision.skillId, decision.targetId);
        continue;
      }
      const foes = engine.getState().units.filter((unit) => unit.alive && unit.team === "bravo");
      const target = foes.sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id))[0];
      if (!target) break;
      const skillId = engine.canAct(actorId, "special", target.id).ok ? "special" : "basic";
      engine.resolveFully(actorId, skillId, target.id);
    }
    const ended = engine.getState();
    expect(ended.phase).toBe("ended");
    expect(ended.winner === "alpha" || ended.winner === "bravo").toBe(true);
    expect(ended.log.some((event) => event.type === "unit-defeated")).toBe(true);
  });

  it("supports the alternate mixed lineup without engine edits", () => {
    const engine = new BattleEngine(22, lineupToSpawns(LINEUP_2V2_MIXED));
    const alpha = engine.getState().units.filter((unit) => unit.team === "alpha").map((unit) => unit.id);
    const bravo = engine.getState().units.filter((unit) => unit.team === "bravo").map((unit) => unit.id);
    expect(alpha).toEqual(["zoro", "nami"]);
    expect(bravo).toEqual(["sanji", "usopp"]);
  });

  it("caps Guard charges and aborts skinned missing-view actions without damage", () => {
    const engine = new BattleEngine(14, [
      { id: "zoro", manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 30, startEnergy: 5 },
      { id: "dummy", manifestId: "synthetic-dummy", team: "bravo", speed: 1, maxHp: 100 },
    ]);
    engine.resolveFully("zoro", "guard", "zoro");
    expect(engine.getState().units.find((unit) => unit.id === "zoro")!.guardCharges).toBe(1);
    expect(engine.getState().units.find((unit) => unit.id === "zoro")!.guardCharges).toBeLessThanOrEqual(MAX_GUARD_CHARGES);
    const dummyHp = engine.getState().units.find((unit) => unit.id === "dummy")!.hp;
    expect(resolveModeForAction(ZORO_MANIFEST, skillOf(ZORO_MANIFEST, "basic"), false).mode).toBe("abort");
    expect(
      resolveModeForAction({ ...FIXTURE_MANIFEST, assetId: null }, skillOf(FIXTURE_MANIFEST, "action-a"), false).mode,
    ).toBe("instant");
    expect(dummyHp).toBe(100);
  });

  it("forfeits a pending action and advances the turn so AI cannot infinite-retry", () => {
    const engine = new BattleEngine(15, [
      { id: "nami", manifestId: NAMI_MANIFEST.id, team: "bravo", speed: 40, startEnergy: 5 },
      { id: "zoro", manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 1 },
    ]);
    expect(engine.currentActorId()).toBe("nami");
    engine.beginAction("nami", "basic", "zoro");
    const actionId = engine.currentActionId()!;
    const beforeEnergy = engine.getState().units.find((unit) => unit.id === "nami")!.energy;
    const events = engine.forfeitPendingAction("missing view", actionId);
    expect(events.some((event) => event.type === "action-aborted")).toBe(true);
    expect(engine.getState().units.find((unit) => unit.id === "nami")!.energy).toBeGreaterThanOrEqual(beforeEnergy);
    expect(engine.currentActorId()).toBe("zoro");
    expect(engine.getState().units.find((unit) => unit.id === "zoro")!.hp).toBe(100);
  });

  it("builds a random 5v5 with every skinned character plus dummy fillers", () => {
    const lineup = buildRandom5v5Lineup(42);
    expect(lineup.units).toHaveLength(10);
    expect(lineup.seed).toBe(42);
    expect(lineup.units.filter((unit) => unit.team === "alpha")).toHaveLength(5);
    expect(lineup.units.filter((unit) => unit.team === "bravo")).toHaveLength(5);
    const skinnedIds = new Set(SKINNED_BATTLE_ROSTER.map((unit) => unit.id));
    const present = lineup.units.filter((unit) => skinnedIds.has(unit.id));
    expect(present).toHaveLength(SKINNED_BATTLE_ROSTER.length);
    expect(lineup.units.filter((unit) => unit.presentation === "synthetic")).toHaveLength(
      10 - SKINNED_BATTLE_ROSTER.length,
    );
    expect(SYNTHETIC_MANIFEST.assetId).toBe("synthetic-placeholder");
    const slots = slotsForLineup(lineup.units);
    expect(slots).toHaveLength(10);
    const keys = new Set(slots.map((slot) => slot.position.join(",")));
    expect(keys.size).toBe(10);
    const engine = new BattleEngine(3, lineupToSpawns(lineup));
    expect(engine.getState().units).toHaveLength(10);
    // Same seed is deterministic (Replay).
    expect(buildRandom5v5Lineup(42).units.map((unit) => `${unit.team}:${unit.id}`)).toEqual(
      lineup.units.map((unit) => `${unit.team}:${unit.id}`),
    );
    expect(buildRandom5v5Lineup(42).seed).toBe(42);
    expect(LINEUP_5V5_SYNTHETIC.units).toHaveLength(10);
  });

  it("keeps calibrated contact segments for Onigiri, Bazooka, and Clutch", () => {
    expect(skillOf(ZORO_MANIFEST, "special")).toMatchObject({
      clipId: "Onigiri",
      contactSegment: 0,
      contact: 0.55,
    });
    expect(skillOf(LUFFY_MANIFEST, "special")).toMatchObject({
      clipId: "Bazooka",
      contactSegment: 0,
      contact: 0.62,
    });
    expect(skillOf(ROBIN_MANIFEST, "special")).toMatchObject({
      clipId: "Clutch_1",
      contactSegment: 2,
      contact: 0.48,
      followClips: ["Clutch_2", "Clutch_3", "Clutch_4", "Clutch_5", "Clutch_6", "Clutch_7"],
    });
    // Guard stays on the manifest for engine tests but is omitted from the animation-test UI.
    expect(skillOf(ZORO_MANIFEST, "guard")).toBeTruthy();
    expect(primarySkills(ZORO_MANIFEST).some((skill) => skill.id === "guard")).toBe(false);
  });
});
