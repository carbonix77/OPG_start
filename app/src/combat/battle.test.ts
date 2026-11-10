import { describe, expect, it } from "vitest";
import { meshIndexOf, previewForAsset } from "../inspector/previewConfig";
import { BattleEngine, makeBalancedFiveVFive } from "./engine";
import { FIXTURE_MANIFEST, SANJI_MANIFEST, ZORO_MANIFEST, skillOf } from "./manifests";

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
    while (engine.getState().phase !== "ended" && guard < 200) {
      guard += 1;
      const state = engine.getState();
      const actorId = engine.currentActorId();
      if (!actorId) break;
      const actor = state.units.find((unit) => unit.id === actorId);
      const target = state.units.find((unit) => unit.alive && unit.team !== actor?.team);
      if (!actor || !target) break;
      engine.resolveFully(actor.id, "action-a", target.id);
    }
    const ended = engine.getState();
    expect(ended.phase).toBe("ended");
    expect(ended.winner === "alpha" || ended.winner === "bravo").toBe(true);
    expect(ended.units.filter((unit) => unit.alive).every((unit) => unit.team === ended.winner)).toBe(true);
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
    expect(SANJI_MANIFEST.idleClip).toBe("Sanji_1290");
    expect(SANJI_MANIFEST.skills[0]?.clipId).toBe("Sanji_1300");
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
    expect(sanji?.textureDir).toBe("preview/textures/sanji");
    expect(zoro?.textureDir).toBe("preview/textures/zoro");
    expect(sanji?.textureDir).not.toBe(zoro?.textureDir);
    expect(sanji?.materialSlotByMesh?.[8]).toBe(8);
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
});
