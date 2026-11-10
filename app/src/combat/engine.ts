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
    actionSeq: state.actionSeq,
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

function validateSkillTiming(manifest: CharacterManifest): void {
  for (const skill of manifest.skills) {
    const ordered =
      skill.startup >= 0 &&
      skill.contact >= skill.startup &&
      skill.recovery >= skill.contact &&
      skill.recovery <= 1;
    if (!ordered) {
      throw new Error(`Skill ${manifest.id}/${skill.id} has invalid timing markers.`);
    }
  }
}

function validateSpawns(spawns: UnitSpawn[]): CharacterManifest[] {
  if (spawns.length === 0) throw new Error("Battle needs at least one unit");
  const ids = new Set<string>();
  let alpha = 0;
  let bravo = 0;
  const manifests: CharacterManifest[] = [];
  for (const spawn of spawns) {
    if (!spawn.id) throw new Error("Unit id is required.");
    if (ids.has(spawn.id)) throw new Error(`Duplicate unit id ${spawn.id}`);
    ids.add(spawn.id);
    const manifest = manifestOf(spawn.manifestId);
    if (!manifest) throw new Error(`Unknown manifest ${spawn.manifestId}`);
    validateSkillTiming(manifest);
    const maxHp = spawn.maxHp ?? manifest.maxHp;
    const speed = spawn.speed ?? manifest.speed;
    if (!(maxHp > 0)) throw new Error(`Unit ${spawn.id} needs positive HP.`);
    if (!(speed > 0)) throw new Error(`Unit ${spawn.id} needs positive speed.`);
    if (spawn.team === "alpha") alpha += 1;
    else if (spawn.team === "bravo") bravo += 1;
    else throw new Error(`Unit ${spawn.id} has an unknown team.`);
    manifests.push(manifest);
  }
  if (alpha === 0 || bravo === 0) throw new Error("Both teams must have at least one unit.");
  return manifests;
}

export class BattleEngine {
  private state: BattleState;

  constructor(seed: number, spawns: UnitSpawn[]) {
    const manifests = validateSpawns(spawns);
    const units = spawns.map((spawn, index) => buildUnit(spawn, manifests[index]));
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
      actionSeq: 0,
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

  currentActionId(): number | null {
    return this.state.pending?.id ?? null;
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
    this.state.actionSeq += 1;
    const actionId = this.state.actionSeq;
    this.state.phase = "acting";
    this.state.pending = { id: actionId, actorId, skillId, targetId, contactApplied: false };
    const started: BattleEvent = { type: "action-started", actionId, actorId, skillId, targetId };
    this.state.log.push(started);
    return [started];
  }

  applyContact(actionId?: number): BattleEvent[] {
    const pending = this.state.pending;
    if (!pending || this.state.phase !== "acting") {
      const blocked: BattleEvent = { type: "blocked", reason: "No active action for contact." };
      this.state.log.push(blocked);
      return [blocked];
    }
    if (actionId !== undefined && pending.id !== actionId) {
      const blocked: BattleEvent = { type: "blocked", reason: "Stale action contact ignored." };
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
    if (!target.alive) {
      const blocked: BattleEvent = { type: "blocked", reason: "Target is already defeated." };
      this.state.log.push(blocked);
      return [blocked];
    }
    pending.contactApplied = true;
    const damage = Math.max(0, skill.damage);
    target.hp = Math.max(0, target.hp - damage);
    const events: BattleEvent[] = [
      {
        type: "contact",
        actionId: pending.id,
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

  /**
   * Completes an action that already applied contact, or was intentionally resolved headless.
   * Does not invent contact. Interrupted presentation must call abortAction instead.
   */
  finishAction(actionId?: number): BattleEvent[] {
    const pending = this.state.pending;
    if (!pending || this.state.phase !== "acting") {
      const blocked: BattleEvent = { type: "blocked", reason: "No active action to finish." };
      this.state.log.push(blocked);
      return [blocked];
    }
    if (actionId !== undefined && pending.id !== actionId) {
      const blocked: BattleEvent = { type: "blocked", reason: "Stale action finish ignored." };
      this.state.log.push(blocked);
      return [blocked];
    }
    if (!pending.contactApplied) {
      const blocked: BattleEvent = {
        type: "blocked",
        reason: "Contact was not applied. Abort the action or resolveFully in headless mode.",
      };
      this.state.log.push(blocked);
      return [blocked];
    }
    const finished: BattleEvent = {
      type: "action-finished",
      actionId: pending.id,
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

  /** Cancels the active action without damage. Keeps the same actor's turn. */
  abortAction(reason: string, actionId?: number): BattleEvent[] {
    const pending = this.state.pending;
    if (!pending || this.state.phase !== "acting") {
      const blocked: BattleEvent = { type: "blocked", reason: "No active action to abort." };
      this.state.log.push(blocked);
      return [blocked];
    }
    if (actionId !== undefined && pending.id !== actionId) {
      const blocked: BattleEvent = { type: "blocked", reason: "Stale action abort ignored." };
      this.state.log.push(blocked);
      return [blocked];
    }
    const aborted: BattleEvent = {
      type: "action-aborted",
      actionId: pending.id,
      actorId: pending.actorId,
      skillId: pending.skillId,
      reason,
    };
    this.state.log.push(aborted);
    this.state.pending = null;
    this.state.phase = this.state.winner ? "ended" : "idle";
    return [aborted];
  }

  /** Headless full resolve for tests and synthetic units. Explicitly applies contact. */
  resolveFully(actorId: string, skillId: string, targetId: string): BattleEvent[] {
    const started = this.beginAction(actorId, skillId, targetId);
    if (started.some((event) => event.type === "blocked")) return started;
    const actionId = this.state.pending?.id;
    const contact = this.applyContact(actionId);
    const finished = this.finishAction(actionId);
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
