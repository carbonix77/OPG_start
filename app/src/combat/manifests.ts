import type { CharacterManifest, SkillDef } from "./types";

function skill(
  partial: Omit<SkillDef, "energyCost" | "energyGain" | "targetMode"> &
    Partial<Pick<SkillDef, "energyCost" | "energyGain" | "targetMode" | "grantGuardCharges">>,
): SkillDef {
  return {
    ...partial,
    energyCost: partial.energyCost ?? 0,
    energyGain: partial.energyGain ?? 0,
    targetMode: partial.targetMode ?? "enemy",
  };
}

function guardSkill(clipId: string | null): SkillDef {
  return skill({
    id: "guard",
    label: "Guard",
    damage: 0,
    startup: 0,
    contact: 0,
    recovery: 1,
    clipId,
    confidence: "synthetic",
    energyCost: 1,
    energyGain: 0,
    targetMode: "self",
    grantGuardCharges: 1,
  });
}

/**
 * Skill timings are preview markers for gameplay sync.
 * They are not recovered OPPW4 frame data.
 *
 * Energy: Basic costs 0 and gains 1. Special costs 1 and gains 0 (temp for testing). Guard costs 1.
 * Guard is a custom tactical choice (halves the next incoming hit). Not an authentic PW4 move.
 */
export const ZORO_MANIFEST: CharacterManifest = {
  id: "zoro-roster",
  label: "Zoro roster",
  maxHp: 100,
  speed: 12,
  /** Battle presentation uses slim private-assets/glb/zoro.glb named clips. */
  assetId: "glb-zoro",
  idleClip: "Idle",
  hitClip: "Hit",
  deathClip: "Death",
  startEnergy: 1,
  maxEnergy: 5,
  skills: [
    skill({
      id: "basic",
      label: "Basic Attack",
      damage: 18,
      startup: 0.12,
      contact: 0.35,
      recovery: 0.85,
      clipId: "Attack",
      confidence: "named",
      energyCost: 0,
      energyGain: 1,
    }),
    skill({
      id: "special",
      label: "Oni Giri",
      damage: 32,
      startup: 0.12,
      contact: 0.4,
      recovery: 0.9,
      clipId: "Onigiri",
      confidence: "named",
      energyCost: 1,
      energyGain: 0,
    }),
    skill({
      id: "special-2",
      label: "Dragon Twister",
      damage: 36,
      startup: 0.15,
      contact: 0.45,
      recovery: 0.9,
      clipId: "Dragon_Twister",
      confidence: "named",
      energyCost: 1,
      energyGain: 0,
    }),
    /** Kept for later; omitted from primarySkills / battle UI for now. */
    skill({
      id: "asura",
      label: "Asura",
      damage: 40,
      startup: 0.15,
      contact: 0.4,
      recovery: 0.95,
      clipId: "Asura_Central",
      companionClips: ["Asura_Left", "Asura_right"],
      confidence: "named",
      energyCost: 1,
      energyGain: 0,
    }),
    guardSkill("Block"),
  ],
};

export const DUMMY_MANIFEST: CharacterManifest = {
  id: "synthetic-dummy",
  label: "Synthetic dummy",
  maxHp: 60,
  speed: 4,
  assetId: null,
  idleClip: null,
  startEnergy: 0,
  maxEnergy: 5,
  skills: [
    skill({
      id: "dummy-poke",
      label: "Dummy poke",
      damage: 5,
      startup: 0,
      contact: 0,
      recovery: 1,
      clipId: null,
      confidence: "synthetic",
      energyCost: 0,
      energyGain: 1,
    }),
    guardSkill(null),
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
  startEnergy: 1,
  maxEnergy: 5,
  skills: [
    skill({
      id: "action-a",
      label: "Fixture action A",
      damage: 9,
      startup: 0.1,
      contact: 0.4,
      recovery: 0.9,
      clipId: "fixture-action-a",
      confidence: "synthetic",
      energyCost: 0,
      energyGain: 1,
    }),
    skill({
      id: "reaction",
      label: "Fixture reaction",
      damage: 0,
      startup: 0,
      contact: 0,
      recovery: 1,
      clipId: "fixture-reaction",
      confidence: "synthetic",
      energyCost: 0,
      energyGain: 0,
    }),
    skill({
      id: "special",
      label: "Fixture special",
      damage: 18,
      startup: 0.1,
      contact: 0.4,
      recovery: 0.9,
      clipId: "fixture-action-a",
      confidence: "synthetic",
      energyCost: 1,
      energyGain: 0,
    }),
    guardSkill("fixture-idle"),
  ],
};

/** Rendered 5v5 placeholders. Not a PW4 skinned asset. */
export const SYNTHETIC_MANIFEST: CharacterManifest = {
  id: "synthetic-fighter",
  label: "Synthetic fighter",
  maxHp: 36,
  speed: 10,
  assetId: "synthetic-placeholder",
  idleClip: "synth-idle",
  startEnergy: 1,
  maxEnergy: 5,
  skills: [
    skill({
      id: "basic",
      label: "Basic",
      damage: 8,
      startup: 0.1,
      contact: 0.4,
      recovery: 0.9,
      clipId: "synth-basic",
      confidence: "synthetic",
      energyCost: 0,
      energyGain: 1,
    }),
    skill({
      id: "special",
      label: "Special",
      damage: 16,
      startup: 0.1,
      contact: 0.45,
      recovery: 0.9,
      clipId: "synth-special",
      confidence: "synthetic",
      energyCost: 1,
      energyGain: 0,
    }),
    guardSkill("synth-idle"),
  ],
};

export const SANJI_MANIFEST: CharacterManifest = {
  id: "sanji-roster",
  label: "Sanji roster",
  maxHp: 95,
  speed: 13,
  /** Slim private-assets/glb/sanji.glb named battle clips. */
  assetId: "glb-sanji",
  idleClip: "Idle",
  hitClip: "Hit",
  deathClip: "Death",
  startEnergy: 1,
  maxEnergy: 5,
  skills: [
    skill({
      id: "basic",
      label: "Basic Attack",
      damage: 16,
      startup: 0.12,
      contact: 0.35,
      recovery: 0.9,
      clipId: "Attack",
      confidence: "named",
      energyCost: 0,
      energyGain: 1,
    }),
    skill({
      id: "special",
      label: "Diable Jambe",
      damage: 34,
      startup: 0.12,
      contact: 0.35,
      recovery: 0.95,
      clipId: "Diable_Jambe_1",
      followClips: ["Diable_Jambe_2", "Diable_Jambe_3", "Diable_Jambe_4"],
      confidence: "named",
      energyCost: 1,
      energyGain: 0,
    }),
    skill({
      id: "special-2",
      label: "Party Table Kick Course",
      damage: 30,
      startup: 0.12,
      contact: 0.4,
      recovery: 0.95,
      clipId: "Party_Table_Kick_Course_1",
      followClips: ["Party_Table_Kick_Course_2", "Party_Table_Kick_Course_3"],
      confidence: "named",
      energyCost: 1,
      energyGain: 0,
    }),
    guardSkill("Block"),
  ],
};

export const NAMI_MANIFEST: CharacterManifest = {
  id: "nami-roster",
  label: "Nami roster",
  maxHp: 80,
  speed: 11,
  /** Slim private-assets/glb/nami.glb named battle clips. */
  assetId: "glb-nami",
  idleClip: "Idle",
  hitClip: "Hit",
  deathClip: "Death",
  startEnergy: 1,
  maxEnergy: 5,
  skills: [
    skill({
      id: "basic",
      label: "Staff Strike",
      damage: 12,
      startup: 0.12,
      contact: 0.35,
      recovery: 0.85,
      clipId: "Attack",
      confidence: "named",
      energyCost: 0,
      energyGain: 1,
    }),
    skill({
      id: "special",
      label: "Thunderbolt Tempo",
      damage: 24,
      startup: 0.1,
      contact: 0.4,
      recovery: 0.9,
      clipId: "Thunderbolt_Tempo",
      confidence: "named",
      energyCost: 1,
      energyGain: 0,
    }),
    skill({
      id: "special-2",
      label: "Cyclone Tempo",
      damage: 22,
      startup: 0.12,
      contact: 0.4,
      recovery: 0.95,
      clipId: "Cyclone_Tempo",
      confidence: "named",
      energyCost: 1,
      energyGain: 0,
    }),
    guardSkill("Block"),
  ],
};

export const USOPP_MANIFEST: CharacterManifest = {
  id: "usopp-roster",
  label: "Usopp roster",
  maxHp: 75,
  speed: 10,
  /** Slim private-assets/glb/usopp.glb named battle clips. */
  assetId: "glb-usopp",
  idleClip: "Idle",
  hitClip: "Hit",
  deathClip: "Death",
  startEnergy: 1,
  maxEnergy: 5,
  skills: [
    skill({
      id: "basic",
      label: "Lead Star",
      damage: 11,
      startup: 0.12,
      contact: 0.35,
      recovery: 0.85,
      clipId: "Attack",
      confidence: "named",
      energyCost: 0,
      energyGain: 1,
    }),
    skill({
      id: "special",
      label: "Fire Star",
      damage: 22,
      startup: 0.1,
      contact: 0.4,
      recovery: 0.9,
      clipId: "Fire_Star",
      confidence: "named",
      energyCost: 1,
      energyGain: 0,
    }),
    skill({
      id: "special-2",
      label: "Sunflower Star",
      damage: 20,
      startup: 0.12,
      contact: 0.4,
      recovery: 0.95,
      clipId: "Sunflower_Star",
      confidence: "named",
      energyCost: 1,
      energyGain: 0,
    }),
    guardSkill("Block"),
  ],
};

export const MANIFEST_BY_ID: Record<string, CharacterManifest> = {
  [ZORO_MANIFEST.id]: ZORO_MANIFEST,
  [DUMMY_MANIFEST.id]: DUMMY_MANIFEST,
  [FIXTURE_MANIFEST.id]: FIXTURE_MANIFEST,
  [SYNTHETIC_MANIFEST.id]: SYNTHETIC_MANIFEST,
  [SANJI_MANIFEST.id]: SANJI_MANIFEST,
  [NAMI_MANIFEST.id]: NAMI_MANIFEST,
  [USOPP_MANIFEST.id]: USOPP_MANIFEST,
};

export function manifestOf(id: string): CharacterManifest | null {
  return MANIFEST_BY_ID[id] ?? null;
}

export function skillOf(manifest: CharacterManifest, skillId: string) {
  return manifest.skills.find((row) => row.id === skillId) ?? null;
}

/** Compact command set: Basic, Special(s), Guard. Asura stays on the manifest but is hidden from battle UI for now. */
export function primarySkills(manifest: CharacterManifest): SkillDef[] {
  const basic = skillOf(manifest, "basic") ?? skillOf(manifest, "action-a") ?? skillOf(manifest, "dummy-poke");
  const special = skillOf(manifest, "special");
  const special2 = skillOf(manifest, "special-2");
  const guard = skillOf(manifest, "guard");
  return [basic, special, special2, guard].filter((row): row is SkillDef => !!row);
}
