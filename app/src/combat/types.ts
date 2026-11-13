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
  /**
   * Normalized time within the contact segment (0–1 of that clip's from→to).
   * Single-hit semantics: exactly one contact event per skill presentation.
   */
  contact: number;
  recovery: number;
  /**
   * Which clip in `[clipId, ...followClips]` owns the contact frame (0-based).
   * Default 0 = first/only clip. Multipart specials (e.g. Robin Clutch) set this
   * to the damaging segment so Hit/Death are not fired on anticipation frames.
   */
  contactSegment?: number;
  /** Clip already in the loaded file, or null when this skill has no animation. */
  clipId: string | null;
  /**
   * Extra clips started with clipId on separate skinned copies (Asura left/right).
   * Presentation only; headless resolve ignores them.
   */
  companionClips?: string[];
  /**
   * Extra clips played after clipId on the same body, in order (Sanji multi-part specials).
   * Presentation only; headless resolve ignores them.
   */
  followClips?: string[];
  /**
   * Short note for calibrated impact frames (REVIEW / owner inspection).
   * Not used by the engine.
   */
  contactNote?: string;
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
  /** Played when this unit takes a non-lethal hit. Null skips reaction. */
  hitClip?: string | null;
  /** Played when this unit is defeated. Null skips death presentation. */
  deathClip?: string | null;
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

/** Max simultaneous Guard charges. Guard does not stack beyond this. */
export const MAX_GUARD_CHARGES = 1;
