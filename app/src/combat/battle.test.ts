import { describe, expect, it } from "vitest";
import { BattleEngine, makeBalancedFiveVFive } from "./engine";
import { FIXTURE_MANIFEST, ZORO_MANIFEST, skillOf } from "./manifests";

describe("BattleEngine", () => {
  it("uses a seeded initiative order", () => {
    const a = new BattleEngine(7, [
      { id: "zoro", manifestId: "zoro-roster", team: "alpha" },
      { id: "dummy", manifestId: "synthetic-dummy", team: "bravo" },
    ]);
    const b = new BattleEngine(7, [
      { id: "zoro", manifestId: "zoro-roster", team: "alpha" },
      { id: "dummy", manifestId: "synthetic-dummy", team: "bravo" },
    ]);
    expect(a.getState().order).toEqual(b.getState().order);
    expect(a.currentActorId()).toBe(a.getState().order[0]);
  });

  it("applies basic-attack damage exactly once at contact", () => {
    const engine = new BattleEngine(1, [
      { id: "zoro", manifestId: "zoro-roster", team: "alpha", speed: 20 },
      { id: "dummy", manifestId: "synthetic-dummy", team: "bravo", speed: 1 },
    ]);
    expect(engine.currentActorId()).toBe("zoro");
    engine.beginAction("zoro", "basic", "dummy");
    const first = engine.applyContact();
    const again = engine.applyContact();
    expect(first.some((event) => event.type === "contact")).toBe(true);
    expect(again.some((event) => event.type === "blocked")).toBe(true);
    const dummy = engine.getState().units.find((unit) => unit.id === "dummy");
    const skill = skillOf(ZORO_MANIFEST, "basic");
    expect(dummy?.hp).toBe(60 - (skill?.damage ?? 0));
    engine.finishAction();
    expect(engine.getState().phase === "idle" || engine.getState().phase === "ended").toBe(true);
  });

  it("blocks invalid targets and dead actors", () => {
    const engine = new BattleEngine(2, [
      { id: "zoro", manifestId: "zoro-roster", team: "alpha", speed: 20 },
      { id: "dummy", manifestId: "synthetic-dummy", team: "bravo", speed: 1, maxHp: 18 },
    ]);
    expect(engine.canAct("zoro", "basic", "zoro").ok).toBe(false);
    engine.resolveFully("zoro", "basic", "dummy");
    expect(engine.getState().units.find((unit) => unit.id === "dummy")?.alive).toBe(false);
    expect(engine.getState().phase).toBe("ended");
    expect(engine.canAct("dummy", "dummy-poke", "zoro").ok).toBe(false);
  });

  it("keeps hp at zero and supports reset plus three sequential attacks", () => {
    const engine = new BattleEngine(3, [
      { id: "zoro", manifestId: "zoro-roster", team: "alpha", speed: 30 },
      { id: "dummy", manifestId: "synthetic-dummy", team: "bravo", speed: 1, maxHp: 100 },
    ]);
    for (let i = 0; i < 3; i += 1) {
      if (engine.currentActorId() !== "zoro") {
        // Dummy poke does tiny damage so Zoro remains able to finish the sequence.
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
});
