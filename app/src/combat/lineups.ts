import type { UnitSpawn } from "./engine";
import { NAMI_MANIFEST, SANJI_MANIFEST, USOPP_MANIFEST, ZORO_MANIFEST } from "./manifests";

/** Data-driven lineup. Battle UI swaps this without hard-coding engine ids. */
export interface LineupUnit {
  id: string;
  manifestId: string;
  team: "alpha" | "bravo";
  label: string;
  speed?: number;
  maxHp?: number;
  startEnergy?: number;
  /** Noesis battle asset id (required for skinned presentation). */
  noesisAssetId: string;
  /** Local Blender GLB asset id for validation. */
  glbAssetId: string;
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
};
const SANJI: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "sanji",
  manifestId: SANJI_MANIFEST.id,
  label: "Sanji",
  noesisAssetId: "noesis-sanji",
  glbAssetId: "glb-sanji",
};
const NAMI: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "nami",
  manifestId: NAMI_MANIFEST.id,
  label: "Nami",
  noesisAssetId: "noesis-nami",
  glbAssetId: "glb-nami",
};
const USOPP: Omit<LineupUnit, "team" | "speed" | "maxHp"> = {
  id: "usopp",
  manifestId: USOPP_MANIFEST.id,
  label: "Usopp",
  noesisAssetId: "noesis-usopp",
  glbAssetId: "glb-usopp",
};

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

export const BATTLE_LINEUPS: LineupDefinition[] = [LINEUP_2V2_STRAW_HAT, LINEUP_2V2_MIXED];

export function lineupById(id: string): LineupDefinition {
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

export function assetIdForUnit(unit: LineupUnit, source: "noesis" | "glb"): string {
  return source === "glb" ? unit.glbAssetId : unit.noesisAssetId;
}
