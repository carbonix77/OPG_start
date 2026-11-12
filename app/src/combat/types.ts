/** Headless battle types. No renderer or character asset names live here. */

export type TeamId = "alpha" | "bravo";

export type BattlePhase = "idle" | "acting" | "ended";

export type SkillTargetMode = "enemy" | "self";

export interface SkillDef {
  id: string;
  label: string;
  damage: number;
  /** Normalized clip times. Presentation may ignore them for synthetic units. */
  startup: number;
  contact: number;
  recovery: number;
  /** Clip already in the loaded file, or null when this skill has no animation. */
  clipId: string | null;
  confidence: "provisional" | "candidate" | "named" | "synthetic";
  /** Energy spent when the action begins. */
  energyCost: number;
  /** Energy gained when contact lands (capped by unit maxEnergy). */
  energyGain: number;
  /** Who the skill may legally target. Default enemy. */
  targetMode: SkillTargetMode;
  /**
   * If set, after contact the actor gains this many Guard charges.
   * Each incoming hit consumes one charge and multiplies damage by guardFactor.
   */
  grantGuardCharges?: number;
}

export interface CharacterManifest {
  id: string;
  label: string;
  maxHp: number;
  speed: number;
  /** Local asset id, or null for a synthetic fixture with no file. */
  assetId: string | null;
  idleClip: string | null;
  /** Starting energy for a fresh unit. */
  startEnergy: number;
  /** Hard cap for the energy meter. */
  maxEnergy: number;
  skills: SkillDef[];
}

export interface UnitState {
  id: string;
  manifestId: string;
  label: string;
  team: TeamId;
  hp: number;
  maxHp: number;
  speed: number;
  energy: number;
  maxEnergy: number;
  /** Remaining Guard charges (tactical). */
  guardCharges: number;
  alive: boolean;
}

export interface PendingAction {
  id: number;
  actorId: string;
  skillId: string;
  targetId: string;
  contactApplied: boolean;
  energySpent: number;
}

export interface BattleState {
  seed: number;
  phase: BattlePhase;
  turnIndex: number;
  order: string[];
  units: UnitState[];
  pending: PendingAction | null;
  winner: TeamId | null;
  log: BattleEvent[];
  /** Monotonic action id. Presentation stale checks compare against this. */
  actionSeq: number;
}

export type BattleEvent =
  | { type: "battle-started"; seed: number; order: string[] }
  | { type: "turn"; turnIndex: number; actorId: string }
  | { type: "action-started"; actionId: number; actorId: string; skillId: string; targetId: string; energySpent: number; energyLeft: number }
  | {
      type: "contact";
      actionId: number;
      actorId: string;
      skillId: string;
      targetId: string;
      damage: number;
      rawDamage: number;
      guarded: boolean;
      targetHp: number;
      energyGained: number;
      actorEnergy: number;
      guardChargesGranted: number;
    }
  | { type: "action-finished"; actionId: number; actorId: string; skillId: string }
  | { type: "action-aborted"; actionId: number; actorId: string; skillId: string; reason: string }
  | { type: "blocked"; reason: string }
  | { type: "unit-defeated"; unitId: string }
  | { type: "battle-ended"; winner: TeamId };

/** Incoming damage multiplier while a Guard charge remains. */
export const GUARD_DAMAGE_FACTOR = 0.5;
