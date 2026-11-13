import { createRng } from "./rng";
import type { UnitSpawn } from "./engine";
import {
  ACE_MANIFEST,
  BROOK_MANIFEST,
  CHOPPER_MANIFEST,
  FRANKY_MANIFEST,
  LUFFY_MANIFEST,
  NAMI_MANIFEST,
  ROBIN_MANIFEST,
  SANJI_MANIFEST,
  SYNTHETIC_MANIFEST,
  USOPP_MANIFEST,
  ZORO_MANIFEST,
} from "./manifests";

/** Data-driven lineup. Battle UI swaps this without hard-coding engine ids. */
export interface LineupUnit {
  id: string;
  manifestId: string;
  team: "alpha" | "bravo";
  label: string;
  speed?: number;
  maxHp?: number;
  startEnergy?: number;
  /** Noesis battle asset id (skinned). Ignored for synthetic presentation. */
  noesisAssetId?: string;
  /** Local Blender GLB asset id. Ignored for synthetic presentation. */
  glbAssetId?: string;
  /** skinned = CharacterUnitView; synthetic = generated placeholder. */
  presentation?: "skinned" | "synthetic";
}

export interface LineupDefinition {
  id: string;
  label: string;
  units: LineupUnit[];
}

const ZORO: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "zoro",
  manifestId: ZORO_MANIFEST.id,
  label: "Zoro",
  noesisAssetId: "noesis-roster",
  glbAssetId: "glb-zoro",
  presentation: "skinned",
};
const SANJI: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "sanji",
  manifestId: SANJI_MANIFEST.id,
  label: "Sanji",
  noesisAssetId: "noesis-sanji",
  glbAssetId: "glb-sanji",
  presentation: "skinned",
};
const NAMI: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "nami",
  manifestId: NAMI_MANIFEST.id,
  label: "Nami",
  noesisAssetId: "noesis-nami",
  glbAssetId: "glb-nami",
  presentation: "skinned",
};
const USOPP: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "usopp",
  manifestId: USOPP_MANIFEST.id,
  label: "Usopp",
  noesisAssetId: "noesis-usopp",
  glbAssetId: "glb-usopp",
  presentation: "skinned",
};
const ACE: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "ace",
  manifestId: ACE_MANIFEST.id,
  label: "Ace",
  glbAssetId: "glb-ace",
  presentation: "skinned",
};
const BROOK: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "brook",
  manifestId: BROOK_MANIFEST.id,
  label: "Brook",
  glbAssetId: "glb-brook",
  presentation: "skinned",
};
const CHOPPER: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "chopper",
  manifestId: CHOPPER_MANIFEST.id,
  label: "Chopper",
  glbAssetId: "glb-chopper",
  presentation: "skinned",
};
const ROBIN: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "robin",
  manifestId: ROBIN_MANIFEST.id,
  label: "Robin",
  glbAssetId: "glb-robin",
  presentation: "skinned",
};
const FRANKY: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "franky",
  manifestId: FRANKY_MANIFEST.id,
  label: "Franky",
  glbAssetId: "glb-franky",
  presentation: "skinned",
};
const LUFFY: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "luffy",
  manifestId: LUFFY_MANIFEST.id,
  label: "Luffy",
  glbAssetId: "glb-luffy",
  presentation: "skinned",
};

/** Every skinned battle character currently wired. */
export const SKINNED_BATTLE_ROSTER: ReadonlyArray<Omit<LineupUnit, "team" | "speed" | "maxHp">> = [
  ZORO,
  SANJI,
  NAMI,
  USOPP,
  ACE,
  BROOK,
  CHOPPER,
  ROBIN,
  FRANKY,
  LUFFY,
];

const FIVE_V_FIVE_ID = "synth-5v5";
const FIVE_V_FIVE_SIZE = 10;
const TEAM_SIZE = 5;

function shuffleInPlace<T>(items: T[], rand: () => number): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
}

/**
 * 5v5 with every wired skinned character placed randomly across both teams,
 * then synthetic dummies filling remaining slots.
 */
export function buildRandom5v5Lineup(seed: number): LineupDefinition {
  const rand = createRng(seed);
  const skinned = SKINNED_BATTLE_ROSTER.map((unit) => ({ ...unit }));
  shuffleInPlace(skinned, rand);

  const dummyCount = Math.max(0, FIVE_V_FIVE_SIZE - skinned.length);
  const dummies: LineupUnit[] = Array.from({ length: dummyCount }, (_, i) => ({
    id: `dummy-${i}`,
    manifestId: SYNTHETIC_MANIFEST.id,
    team: "alpha",
    label: `Dummy ${i + 1}`,
    speed: 7 + i,
    presentation: "synthetic" as const,
  }));

  const pool: LineupUnit[] = [
    ...skinned.map((unit) => ({ ...unit, team: "alpha" as const })),
    ...dummies,
  ];
  shuffleInPlace(pool, rand);

  const units = pool.map((unit, index) => {
    const team = index < TEAM_SIZE ? ("alpha" as const) : ("bravo" as const);
    const slot = index % TEAM_SIZE;
    return {
      ...unit,
      team,
      speed: unit.speed ?? 10 + slot * 2,
    };
  });

  return {
    id: FIVE_V_FIVE_ID,
    label: "Random roster 5v5",
    units,
  };
}

/** Classic: Zoro+Sanji vs Nami+Usopp. */
export const LINEUP_2V2_STRAW_HAT: LineupDefinition = {
  id: "straw-hat",
  label: "Zoro+Sanji vs Nami+Usopp",
  units: [
    { ...ZORO, team: "alpha", speed: 20 },
    { ...SANJI, team: "alpha", speed: 18 },
    { ...NAMI, team: "bravo", speed: 12, maxHp: 80 },
    { ...USOPP, team: "bravo", speed: 10, maxHp: 75 },
  ],
};

/** Alternate arrangement of the same four models. */
export const LINEUP_2V2_MIXED: LineupDefinition = {
  id: "mixed",
  label: "Zoro+Nami vs Sanji+Usopp",
  units: [
    { ...ZORO, team: "alpha", speed: 20 },
    { ...NAMI, team: "alpha", speed: 14, maxHp: 80 },
    { ...SANJI, team: "bravo", speed: 16 },
    { ...USOPP, team: "bravo", speed: 10, maxHp: 75 },
  ],
};

/** Catalog entry / deterministic sample (seed 42). Prefer buildRandom5v5Lineup() for live fights. */
export const LINEUP_5V5_SYNTHETIC: LineupDefinition = buildRandom5v5Lineup(42);

export const BATTLE_LINEUPS: LineupDefinition[] = [LINEUP_2V2_STRAW_HAT, LINEUP_2V2_MIXED, LINEUP_5V5_SYNTHETIC];

export function lineupById(id: string): LineupDefinition {
  if (id === FIVE_V_FIVE_ID) {
    return buildRandom5v5Lineup((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
  }
  return BATTLE_LINEUPS.find((row) => row.id === id) ?? LINEUP_2V2_STRAW_HAT;
}

export function lineupToSpawns(lineup: LineupDefinition | LineupUnit[]): UnitSpawn[] {
  const units = Array.isArray(lineup) ? lineup : lineup.units;
  return units.map((unit) => ({
    id: unit.id,
    manifestId: unit.manifestId,
    team: unit.team,
    label: unit.label,
    speed: unit.speed,
    maxHp: unit.maxHp,
    startEnergy: unit.startEnergy,
  }));
}

export function assetIdForUnit(unit: LineupUnit, source: "noesis" | "glb"): string | null {
  if (unit.presentation === "synthetic") return null;
  return source === "glb" ? unit.glbAssetId ?? null : unit.noesisAssetId ?? null;
}
