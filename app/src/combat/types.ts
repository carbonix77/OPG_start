/** Headless battle types. No renderer or character asset names live here. */

export type TeamId = "alpha" | "bravo";

export type BattlePhase = "idle" | "acting" | "ended";

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
}

export interface CharacterManifest {
  id: string;
  label: string;
  maxHp: number;
  speed: number;
  /** Local asset id, or null for a synthetic fixture with no file. */
  assetId: string | null;
  idleClip: string | null;
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
  alive: boolean;
}

export interface PendingAction {
  actorId: string;
  skillId: string;
  targetId: string;
  contactApplied: boolean;
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
}

export type BattleEvent =
  | { type: "battle-started"; seed: number; order: string[] }
  | { type: "turn"; turnIndex: number; actorId: string }
  | { type: "action-started"; actorId: string; skillId: string; targetId: string }
  | { type: "contact"; actorId: string; skillId: string; targetId: string; damage: number; targetHp: number }
  | { type: "action-finished"; actorId: string; skillId: string }
  | { type: "blocked"; reason: string }
  | { type: "unit-defeated"; unitId: string }
  | { type: "battle-ended"; winner: TeamId };
