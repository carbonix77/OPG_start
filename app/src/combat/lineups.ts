import type { UnitSpawn } from "./engine";
import { NAMI_MANIFEST, SANJI_MANIFEST, USOPP_MANIFEST, ZORO_MANIFEST } from "./manifests";

/** Data-driven lineup. Battle UI can swap this without renaming hard-coded ids in the engine. */
export interface LineupUnit {
  id: string;
  manifestId: string;
  team: "alpha" | "bravo";
  label: string;
  speed?: number;
  maxHp?: number;
  startEnergy?: number;
}

export const LINEUP_2V2_STRAW_HAT: LineupUnit[] = [
  { id: "zoro", manifestId: ZORO_MANIFEST.id, team: "alpha", label: "Zoro", speed: 20 },
  { id: "sanji", manifestId: SANJI_MANIFEST.id, team: "alpha", label: "Sanji", speed: 18 },
  { id: "nami", manifestId: NAMI_MANIFEST.id, team: "bravo", label: "Nami", speed: 12, maxHp: 80 },
  { id: "usopp", manifestId: USOPP_MANIFEST.id, team: "bravo", label: "Usopp", speed: 10, maxHp: 75 },
];

export function lineupToSpawns(lineup: LineupUnit[]): UnitSpawn[] {
  return lineup.map((unit) => ({
    id: unit.id,
    manifestId: unit.manifestId,
    team: unit.team,
    label: unit.label,
    speed: unit.speed,
    maxHp: unit.maxHp,
    startEnergy: unit.startEnergy,
  }));
}
