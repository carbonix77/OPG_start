import type { CharacterManifest } from "./types";

/**
 * Skill timings are preview markers for gameplay sync.
 * They are not recovered OPPW4 frame data.
 */
export const ZORO_MANIFEST: CharacterManifest = {
  id: "zoro-roster",
  label: "Zoro roster",
  maxHp: 100,
  speed: 12,
  assetId: "noesis-roster",
  idleClip: "Zoro_0000",
  skills: [
    {
      id: "basic",
      label: "Basic Attack",
      damage: 18,
      startup: 0.12,
      contact: 0.35,
      recovery: 0.85,
      clipId: "Zoro_0500",
      confidence: "candidate",
    },
    {
      id: "oni-combo",
      label: "Combo-order Oni Giri",
      damage: 28,
      startup: 0.2,
      contact: 0.45,
      recovery: 0.9,
      clipId: "Zoro_0650",
      confidence: "candidate",
    },
    {
      id: "special",
      label: "Charming Demon Sleepless Night Onigiri",
      damage: 40,
      startup: 0.08,
      contact: 0.35,
      recovery: 0.9,
      clipId: "Zoro_1330",
      confidence: "named",
    },
    {
      id: "asura",
      label: "Asura main",
      damage: 35,
      startup: 0.15,
      contact: 0.4,
      recovery: 0.9,
      clipId: "Zoro_1320",
      confidence: "named",
    },
  ],
};

export const DUMMY_MANIFEST: CharacterManifest = {
  id: "synthetic-dummy",
  label: "Synthetic dummy",
  maxHp: 60,
  speed: 4,
  assetId: null,
  idleClip: null,
  skills: [
    {
      id: "dummy-poke",
      label: "Dummy poke",
      damage: 5,
      startup: 0,
      contact: 0,
      recovery: 1,
      clipId: null,
      confidence: "synthetic",
    },
  ],
};

/** Proves a non-Zoro definition can drive action → reaction → idle through the same engine. */
export const FIXTURE_MANIFEST: CharacterManifest = {
  id: "fixture-fighter",
  label: "Fixture fighter",
  maxHp: 40,
  speed: 10,
  assetId: "fixture",
  idleClip: "fixture-idle",
  skills: [
    {
      id: "action-a",
      label: "Fixture action A",
      damage: 9,
      startup: 0.1,
      contact: 0.4,
      recovery: 0.9,
      clipId: "fixture-action-a",
      confidence: "synthetic",
    },
    {
      id: "reaction",
      label: "Fixture reaction",
      damage: 0,
      startup: 0,
      contact: 0,
      recovery: 1,
      clipId: "fixture-reaction",
      confidence: "synthetic",
    },
  ],
};

/**
 * Sanji with extracted idle/basic (0000/0500) plus special candidates.
 * Texture sheets stay Sanji-local under preview/textures/sanji.
 */
export const SANJI_MANIFEST: CharacterManifest = {
  id: "sanji-roster",
  label: "Sanji roster",
  maxHp: 95,
  speed: 13,
  assetId: "noesis-sanji",
  idleClip: "Sanji_0000",
  skills: [
    {
      id: "basic",
      label: "Basic Attack",
      damage: 16,
      startup: 0.12,
      contact: 0.35,
      recovery: 0.9,
      clipId: "Sanji_0500",
      confidence: "candidate",
    },
    {
      id: "special",
      label: "Sanji_1330 special candidate",
      damage: 32,
      startup: 0.1,
      contact: 0.4,
      recovery: 0.9,
      clipId: "Sanji_1330",
      confidence: "candidate",
    },
  ],
};

/** Nami idle + basic + special from own G1As. map.json sheet assignment is provisional. */
export const NAMI_MANIFEST: CharacterManifest = {
  id: "nami-roster",
  label: "Nami roster",
  maxHp: 80,
  speed: 11,
  assetId: "noesis-nami",
  idleClip: "Nami_0000",
  skills: [
    {
      id: "basic",
      label: "Basic Attack",
      damage: 12,
      startup: 0.12,
      contact: 0.35,
      recovery: 0.85,
      clipId: "Nami_NewWorld_0500",
      confidence: "candidate",
    },
    {
      id: "special",
      label: "Nami_NewWorld_1300 special candidate",
      damage: 24,
      startup: 0.1,
      contact: 0.4,
      recovery: 0.9,
      clipId: "Nami_NewWorld_1300",
      confidence: "candidate",
    },
  ],
};

/** Usopp idle + basic + special from own G1As. map.json sheet assignment is provisional. */
export const USOPP_MANIFEST: CharacterManifest = {
  id: "usopp-roster",
  label: "Usopp roster",
  maxHp: 75,
  speed: 10,
  assetId: "noesis-usopp",
  idleClip: "Usopp_0000",
  skills: [
    {
      id: "basic",
      label: "Basic Attack",
      damage: 11,
      startup: 0.12,
      contact: 0.35,
      recovery: 0.85,
      clipId: "Usopp_0500",
      confidence: "candidate",
    },
    {
      id: "special",
      label: "Usopp_1300 special candidate",
      damage: 22,
      startup: 0.1,
      contact: 0.4,
      recovery: 0.9,
      clipId: "Usopp_1300",
      confidence: "candidate",
    },
  ],
};

export const MANIFEST_BY_ID: Record<string, CharacterManifest> = {
  [ZORO_MANIFEST.id]: ZORO_MANIFEST,
  [DUMMY_MANIFEST.id]: DUMMY_MANIFEST,
  [FIXTURE_MANIFEST.id]: FIXTURE_MANIFEST,
  [SANJI_MANIFEST.id]: SANJI_MANIFEST,
  [NAMI_MANIFEST.id]: NAMI_MANIFEST,
  [USOPP_MANIFEST.id]: USOPP_MANIFEST,
};

export function manifestOf(id: string): CharacterManifest | null {
  return MANIFEST_BY_ID[id] ?? null;
}

export function skillOf(manifest: CharacterManifest, skillId: string) {
  return manifest.skills.find((skill) => skill.id === skillId) ?? null;
}
