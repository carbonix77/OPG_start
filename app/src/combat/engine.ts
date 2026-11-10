import { createRng } from "./rng";
import { manifestOf, skillOf } from "./manifests";
import type { BattleEvent, BattleState, CharacterManifest, TeamId, UnitState } from "./types";

export interface UnitSpawn {
  id: string;
  manifestId: string;
  team: TeamId;
  label?: string;
  /** Overrides the manifest speed when set. */
  speed?: number;
  /** Overrides the manifest max HP when set. */
  maxHp?: number;
}

function cloneState(state: BattleState): BattleState {
  return {
    seed: state.seed,
    phase: state.phase,
    turnIndex: state.turnIndex,
    order: [...state.order],
    units: state.units.map((unit) => ({ ...unit })),
    pending: state.pending ? { ...state.pending } : null,
    winner: state.winner,
    log: [...state.log],
  };
}

function living(units: UnitState[], team: TeamId): UnitState[] {
  return units.filter((unit) => unit.team === team && unit.alive);
}

function winnerOf(units: UnitState[]): TeamId | null {
  const alpha = living(units, "alpha").length;
  const bravo = living(units, "bravo").length;
  if (bravo === 0) return "alpha";
  if (alpha === 0) return "bravo";
  return null;
}

function buildUnit(spawn: UnitSpawn, manifest: CharacterManifest): UnitState {
  const maxHp = spawn.maxHp ?? manifest.maxHp;
  return {
    id: spawn.id,
    manifestId: manifest.id,
    label: spawn.label ?? manifest.label,
    team: spawn.team,
    hp: maxHp,
    maxHp,
    speed: spawn.speed ?? manifest.speed,
    alive: true,
  };
}

function initiativeOrder(seed: number, units: UnitState[]): string[] {
  const rng = createRng(seed);
  return [...units]
    .map((unit) => ({ id: unit.id, score: unit.speed * 1000 + Math.floor(rng() * 1000) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((row) => row.id);
}

export class BattleEngine {
  private state: BattleState;

  constructor(seed: number, spawns: UnitSpawn[]) {
    const units: UnitState[] = [];
    for (const spawn of spawns) {
      const manifest = manifestOf(spawn.manifestId);
      if (!manifest) throw new Error(`Unknown manifest ${spawn.manifestId}`);
      units.push(buildUnit(spawn, manifest));
    }
    if (units.length === 0) throw new Error("Battle needs at least one unit");
    const order = initiativeOrder(seed, units);
    this.state = {
      seed,
      phase: "idle",
      turnIndex: 0,
      order,
      units,
      pending: null,
      winner: null,
      log: [{ type: "battle-started", seed, order: [...order] }],
    };
    this.pushTurn();
  }

  getState(): BattleState {
    return cloneState(this.state);
  }

  currentActorId(): string | null {
    if (this.state.phase === "ended") return null;
    return this.state.order[this.state.turnIndex % this.state.order.length] ?? null;
  }

  reset(seed = this.state.seed): BattleState {
    const spawns: UnitSpawn[] = this.state.units.map((unit) => ({
      id: unit.id,
      manifestId: unit.manifestId,
      team: unit.team,
      label: unit.label,
      speed: unit.speed,
      maxHp: unit.maxHp,
    }));
    this.state = new BattleEngine(seed, spawns).state;
    return this.getState();
  }

  canAct(actorId: string, skillId: string, targetId: string): { ok: boolean; reason?: string } {
    if (this.state.phase === "ended") return { ok: false, reason: "Battle already ended." };
    if (this.state.phase === "acting") return { ok: false, reason: "An action is already in progress." };
    const actor = this.unit(actorId);
    if (!actor) return { ok: false, reason: "Unknown actor." };
    if (!actor.alive) return { ok: false, reason: "Dead units cannot act." };
    if (this.currentActorId() !== actorId) return { ok: false, reason: "Not this unit's turn." };
    const manifest = manifestOf(actor.manifestId);
    if (!manifest) return { ok: false, reason: "Missing character manifest." };
    const skill = skillOf(manifest, skillId);
    if (!skill) return { ok: false, reason: "Unknown skill." };
    const target = this.unit(targetId);
    if (!target) return { ok: false, reason: "Unknown target." };
    if (!target.alive) return { ok: false, reason: "Target is already defeated." };
    if (target.team === actor.team) return { ok: false, reason: "Friendly targets are blocked in this slice." };
    return { ok: true };
  }

  beginAction(actorId: string, skillId: string, targetId: string): BattleEvent[] {
    const check = this.canAct(actorId, skillId, targetId);
    if (!check.ok) {
      const blocked: BattleEvent = { type: "blocked", reason: check.reason ?? "Blocked." };
      this.state.log.push(blocked);
      return [blocked];
    }
    this.state.phase = "acting";
    this.state.pending = { actorId, skillId, targetId, contactApplied: false };
    const started: BattleEvent = { type: "action-started", actorId, skillId, targetId };
    this.state.log.push(started);
    return [started];
  }

  applyContact(): BattleEvent[] {
    const pending = this.state.pending;
    if (!pending || this.state.phase !== "acting") {
      const blocked: BattleEvent = { type: "blocked", reason: "No active action for contact." };
      this.state.log.push(blocked);
      return [blocked];
    }
    if (pending.contactApplied) {
      const blocked: BattleEvent = { type: "blocked", reason: "Contact already applied." };
      this.state.log.push(blocked);
      return [blocked];
    }
    const actor = this.unit(pending.actorId);
    const target = this.unit(pending.targetId);
    const manifest = actor ? manifestOf(actor.manifestId) : null;
    const skill = manifest ? skillOf(manifest, pending.skillId) : null;
    if (!actor || !target || !skill) {
      const blocked: BattleEvent = { type: "blocked", reason: "Contact missing actor, target, or skill." };
      this.state.log.push(blocked);
      return [blocked];
    }
    pending.contactApplied = true;
    const damage = Math.max(0, skill.damage);
    target.hp = Math.max(0, target.hp - damage);
    const events: BattleEvent[] = [
      {
        type: "contact",
        actorId: pending.actorId,
        skillId: pending.skillId,
        targetId: pending.targetId,
        damage,
        targetHp: target.hp,
      },
    ];
    if (target.hp === 0) {
      target.alive = false;
      events.push({ type: "unit-defeated", unitId: target.id });
    }
    for (const event of events) this.state.log.push(event);
    return events;
  }

  finishAction(): BattleEvent[] {
    const pending = this.state.pending;
    if (!pending || this.state.phase !== "acting") {
      const blocked: BattleEvent = { type: "blocked", reason: "No active action to finish." };
      this.state.log.push(blocked);
      return [blocked];
    }
    if (!pending.contactApplied) this.applyContact();
    const finished: BattleEvent = {
      type: "action-finished",
      actorId: pending.actorId,
      skillId: pending.skillId,
    };
    this.state.log.push(finished);
    this.state.pending = null;
    this.state.phase = "idle";
    const events: BattleEvent[] = [finished];
    const winner = winnerOf(this.state.units);
    if (winner) {
      this.state.phase = "ended";
      this.state.winner = winner;
      const ended: BattleEvent = { type: "battle-ended", winner };
      this.state.log.push(ended);
      events.push(ended);
      return events;
    }
    this.advanceTurn();
    const turn = this.state.log[this.state.log.length - 1];
    if (turn) events.push(turn);
    return events;
  }

  /** Headless full resolve for tests and synthetic units. */
  resolveFully(actorId: string, skillId: string, targetId: string): BattleEvent[] {
    const started = this.beginAction(actorId, skillId, targetId);
    if (started.some((event) => event.type === "blocked")) return started;
    const contact = this.applyContact();
    const finished = this.finishAction();
    return [...started, ...contact.filter((event) => event.type !== "blocked"), ...finished];
  }

  private unit(id: string): UnitState | undefined {
    return this.state.units.find((unit) => unit.id === id);
  }

  private pushTurn(): void {
    const actorId = this.currentActorId();
    if (!actorId) return;
    const actor = this.unit(actorId);
    if (actor && !actor.alive) {
      this.advanceTurn();
      return;
    }
    const event: BattleEvent = { type: "turn", turnIndex: this.state.turnIndex, actorId };
    this.state.log.push(event);
  }

  private advanceTurn(): void {
    if (this.state.phase === "ended") return;
    const total = this.state.order.length;
    for (let step = 0; step < total; step += 1) {
      this.state.turnIndex += 1;
      const actorId = this.currentActorId();
      const actor = actorId ? this.unit(actorId) : null;
      if (actor?.alive) {
        const event: BattleEvent = { type: "turn", turnIndex: this.state.turnIndex, actorId: actor.id };
        this.state.log.push(event);
        return;
      }
    }
    this.state.phase = "ended";
  }
}

/** Ten synthetic units, five per team. Speeds differ; no copyrighted assets. */
export function makeBalancedFiveVFive(seed: number): BattleEngine {
  const spawns: UnitSpawn[] = [];
  for (let i = 0; i < 5; i += 1) {
    spawns.push({
      id: `a${i}`,
      manifestId: "fixture-fighter",
      team: "alpha",
      label: `A${i}`,
      speed: 5 + i * 2,
      maxHp: 30,
    });
    spawns.push({
      id: `b${i}`,
      manifestId: "fixture-fighter",
      team: "bravo",
      label: `B${i}`,
      speed: 6 + i * 2,
      maxHp: 30,
    });
  }
  return new BattleEngine(seed, spawns);
}
