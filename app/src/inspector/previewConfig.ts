/**
 * Character preview settings. The scene reads this and does not name a character.
 * A later character adds a config here. It does not add names inside the scene class.
 */

export interface SwordStack {
  /** Mesh indices whose centers were measured in the same place. */
  indices: number[];
  /**
   * Hide the lower-vertex shells while every center stays within this distance
   * of the highest-vertex mesh. A larger gap shows the whole stack again.
   */
  coincideDistance: number;
}

export interface PreviewShot {
  id: string;
  button: string;
  label: string;
  clip: "idle" | "attack";
  normalized: number;
  alpha: number;
  beta: number;
  /** Fixed orbit radius. Null uses the fitted radius. */
  radius: number | null;
  /** Added to the follow node when this shot holds the camera. */
  targetOffset: [number, number, number];
}

export interface CameraKey {
  /** Normalized time on the attack clip. Idle hold ignores this. */
  t: number;
  alpha: number;
  beta: number;
  radius: number;
  targetOffset: [number, number, number];
}

export interface PreviewEffect {
  id: string;
  /** Normalized time on the attack clip when the effect appears. */
  t: number;
  /** How long it stays up, in seconds. */
  seconds: number;
  kind: "trail" | "bloom" | "burst";
  /** Bone the effect follows. The scene falls back to the follow node. */
  bone: string;
  /**
   * Mesh whose far bound places the anchor. Null keeps offset.
   * The bound is measured on the loaded mesh. It is not a game socket.
   */
  tipMeshIndex: number | null;
  offset: [number, number, number];
  rotation: [number, number, number];
  /** Trail half-width, bloom diameter, or burst travel. */
  size: number;
  color: [number, number, number];
}

export interface CinematicTimeline {
  keys: CameraKey[];
  /** Camera eased in after the attack, over blendSeconds. */
  idleHold: CameraKey;
  effects: PreviewEffect[];
  /**
   * Short preview slowdown. Null skips it.
   * Speed is a fraction of the clip rate. The keys are not edited.
   */
  hitStop: { t: number; seconds: number; speed: number } | null;
  /** Normalized attack times for a contact sheet. Playback does not read this. */
  contactTimes: number[];
}

export interface PreviewBlade {
  /** Sheet sampled by a preview UV crop. Not an original assignment. */
  sheet: string;
  uScale: number;
  vScale: number;
  uOffset: number;
  vOffset: number;
  metallic: number;
  roughness: number;
}

export interface SwordGroup {
  id: string;
  role: "hand" | "mouth" | "hip";
  bone: string;
  indices: number[];
}

export interface MoveBehavior {
  id: string;
  clip: string;
  /** Role text shown beside the clip. A candidate is not a confirmed name. */
  label: string;
  confidence: "provisional" | "candidate" | "named";
}

export interface PhantomSpec {
  clip: string;
  /** Side-by-side placement. Recenter does not edit the clip. */
  offset: [number, number, number];
}

export interface WeaponState {
  clip: string;
  preset: "all" | "hide-static" | "stacks";
  note: string;
}

export interface PreviewConfig {
  id: string;
  textureDir: string;
  /** Sheets in textureDir that have a sibling `_n` file. */
  normalSheets: string[];
  /** Sheets that use alpha test. The cutoff is the inspector's diagnostic value. */
  alphaTestSheets: string[];
  alphaCutOff: number;
  followNodes: string[];
  idleClip: string;
  attackClip: string;
  /** Mesh index of the head-child blade, when this character has one. */
  mouthMeshIndex: number | null;
  /** Bone used to compare pose across the handoff. Null skips that column. */
  poseBone: string | null;
  sheetCandidates: string[];
  /** GLB material slot for mesh index N. Null keeps Material_N names only. */
  materialSlotByMesh: number[] | null;
  /** Sheet used for one mesh instead of the map entry. Empty leaves the map. */
  sheetByMesh: Readonly<Record<number, string>>;
  staticMeshIndices: number[];
  /**
   * Mesh indices that do not belong on this model. They stay in the file and are not drawn.
   */
  excludedMeshIndices: number[];
  stacks: SwordStack[];
  /** Bone groups measured for the three-sword proposal. The page does not hide them. */
  swordGroups: SwordGroup[];
  /** Reversible crop for the mouth mesh. Null when this character has no such test. */
  mouthBlade: PreviewBlade | null;
  handoffSeconds: number;
  blendSeconds: number;
  camera: {
    alpha: number;
    beta: number;
    idleFactor: number;
    attackFactor: number;
    minRadius: number;
    maxRadius: number;
    includeDistance: number;
  };
  stage: {
    clear: [number, number, number];
    ground: [number, number, number];
    keyIntensity: number;
    keyDirection: [number, number, number];
    rimIntensity: number;
    rimDirection: [number, number, number];
    /** Exponential fog. Zero leaves the clear color flat. */
    fogDensity: number;
  };
  shots: PreviewShot[];
  /** Null when this character has no cinematic pass. */
  cinematic: CinematicTimeline | null;
  /** Idle and actions already in this file. The scene does not retarget them. */
  behaviors: MoveBehavior[];
  /** Main clip that may start the phantom copies. Null when there are none. */
  asuraClip: string | null;
  phantoms: PhantomSpec[];
  /** Opt-in notes. Nothing here is applied until the page asks. */
  weaponStates: WeaponState[];
}

export const FOLLOW_NODE_CANDIDATES = ["SK_Skeleton", "bone_1", "bone_0"];

/**
 * Measured on the Noesis present file.
 * Mesh 17 and 27 stay within 0.28 at the sampled times and both skin to one weapon bone.
 * Meshes 30, 33, and 39 stay within 0.44 and skin to the other weapon bone.
 * The distance 1 is above those gaps. It is not a rule from the game.
 * Mesh 36 is skinned to a child of the head bone.
 * The map still sends slot 33 to cloth. The mouth blade uses the whole weapon sheet.
 */
export const ZORO_PREVIEW: PreviewConfig = {
  id: "zoro",
  textureDir: "preview/textures/zoro",
  normalSheets: ["skin", "cloth", "face", "hair"],
  alphaTestSheets: ["hair"],
  alphaCutOff: 0.25,
  followNodes: FOLLOW_NODE_CANDIDATES,
  idleClip: "Zoro_0000",
  attackClip: "Zoro_1330",
  mouthMeshIndex: 36,
  poseBone: "SK_Head",
  sheetCandidates: ["cloth", "weapon", "weapon00", "weapon01", "weapon02", "weapon03", "weapon04"],
  materialSlotByMesh: [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 11, 13, 14, 15, 16, 17, 18, 19, 21, 20, 20, 20, 20, 22, 23, 24, 25, 26, 27,
    28, 29, 30, 31, 32, 33, 34, 35, 36,
  ],
  sheetByMesh: { 36: "weapon" },
  staticMeshIndices: [3, 22, 23, 24],
  excludedMeshIndices: [2],
  stacks: [
    { indices: [17, 27], coincideDistance: 1 },
    { indices: [30, 33, 39], coincideDistance: 1 },
  ],
  swordGroups: [
    { id: "left-hand", role: "hand", bone: "SK_L_Weapon", indices: [17, 27] },
    { id: "right-hand", role: "hand", bone: "SK_R_Weapon", indices: [30, 33, 39] },
    { id: "mouth", role: "mouth", bone: "0x43b3b303", indices: [36] },
    { id: "hip-a", role: "hip", bone: "0x7ede6180", indices: [15, 16, 25, 26] },
    { id: "hip-b", role: "hip", bone: "0x8a94f061", indices: [28, 29, 31, 32, 37, 38] },
    { id: "hip-c", role: "hip", bone: "0x964b7f42", indices: [34, 35] },
  ],
  mouthBlade: {
    sheet: "weapon",
    uScale: 0.06,
    vScale: 0.22,
    uOffset: 0.91,
    vOffset: 0.38,
    metallic: 0.2,
    roughness: 0.4,
  },
  handoffSeconds: 0.3,
  blendSeconds: 0.28,
  camera: {
    alpha: Math.PI / 2,
    beta: 1.15,
    idleFactor: 1.35,
    attackFactor: 1.35,
    minRadius: 450,
    maxRadius: 1400,
    includeDistance: 400,
  },
  stage: {
    clear: [0.08, 0.09, 0.11],
    ground: [0.08, 0.09, 0.11],
    keyIntensity: 1.15,
    keyDirection: [-0.25, -1, -0.45],
    rimIntensity: 0.55,
    rimDirection: [0.7, -0.35, 0.6],
    fogDensity: 0.0011,
  },
  shots: [
    {
      id: "idle",
      button: "Idle",
      label: "Stage idle. Preview lighting, not a game effect.",
      clip: "idle",
      normalized: 0,
      alpha: Math.PI / 2,
      beta: 1.2,
      radius: 470,
      targetOffset: [0, 8, 0],
    },
    {
      id: "anticipation",
      button: "Anticipation",
      label: "Stage anticipation at 0.12. Preview lighting, not a game effect.",
      clip: "attack",
      normalized: 0.12,
      alpha: Math.PI / 2,
      beta: 1.18,
      radius: 520,
      targetOffset: [0, 12, 0],
    },
    {
      id: "strike",
      button: "Strike",
      label: "Stage strike at 0.35. Preview lighting, not a game effect.",
      clip: "attack",
      normalized: 0.35,
      alpha: Math.PI / 2 + 0.22,
      beta: 1.22,
      radius: 540,
      targetOffset: [0, 4, 0],
    },
    {
      id: "recovery",
      button: "Recovery",
      label: "Stage recovery at 0.92. Preview lighting, not a game effect.",
      clip: "attack",
      normalized: 0.92,
      alpha: Math.PI / 2,
      beta: 1.2,
      radius: 500,
      targetOffset: [0, 10, 0],
    },
  ],
  cinematic: {
    keys: [
      { t: 0, alpha: Math.PI / 2, beta: 1.24, radius: 348, targetOffset: [0, 18, 0] },
      { t: 0.08, alpha: Math.PI / 2 + 0.12, beta: 1.16, radius: 310, targetOffset: [0, 18, 0] },
      { t: 0.12, alpha: Math.PI / 2 + 0.2, beta: 1.12, radius: 340, targetOffset: [0, 20, 0] },
      { t: 0.22, alpha: Math.PI / 2 + 0.32, beta: 1.2, radius: 300, targetOffset: [0, 18, 0] },
      { t: 0.35, alpha: Math.PI / 2 + 0.42, beta: 1.24, radius: 305, targetOffset: [0, 16, 0] },
      { t: 0.55, alpha: Math.PI / 2 + 0.2, beta: 1.22, radius: 285, targetOffset: [0, 16, 0] },
      { t: 0.75, alpha: Math.PI / 2 + 0.04, beta: 1.18, radius: 410, targetOffset: [0, 18, 0] },
      { t: 0.92, alpha: Math.PI / 2 - 0.12, beta: 1.22, radius: 325, targetOffset: [0, 18, 0] },
      { t: 1, alpha: Math.PI / 2, beta: 1.24, radius: 430, targetOffset: [0, 18, 0] },
    ],
    idleHold: { t: 0, alpha: Math.PI / 2, beta: 1.26, radius: 430, targetOffset: [0, 16, 0] },
    effects: [
      {
        id: "mouth-trail",
        t: 0,
        seconds: 2.6,
        kind: "trail",
        bone: "0x43b3b303",
        tipMeshIndex: 36,
        offset: [22, 0, 0],
        rotation: [0, 0, 0],
        size: 2.1,
        color: [0.78, 0.9, 1],
      },
      {
        id: "hand-trail",
        t: 0.02,
        seconds: 2.2,
        kind: "trail",
        bone: "SK_R_Weapon",
        tipMeshIndex: 39,
        offset: [0, 22, 0],
        rotation: [0, 0, 0],
        size: 1.6,
        color: [0.9, 0.94, 1],
      },
      {
        id: "strike-bloom",
        t: 0.33,
        seconds: 0.2,
        kind: "bloom",
        bone: "0x43b3b303",
        tipMeshIndex: 36,
        offset: [22, 0, 0],
        rotation: [0, 0, 0],
        size: 7,
        color: [1, 0.94, 0.8],
      },
      {
        id: "strike-burst",
        t: 0.33,
        seconds: 0.14,
        kind: "burst",
        bone: "0x43b3b303",
        tipMeshIndex: 36,
        offset: [22, 0, 0],
        rotation: [0, 0, 0],
        size: 5,
        color: [1, 0.96, 0.88],
      },
    ],
    hitStop: { t: 0.34, seconds: 0.1, speed: 0.45 },
    contactTimes: [0, 0.08, 0.12, 0.22, 0.35, 0.55, 0.75, 0.92, 1],
  },
  behaviors: [
    { id: "idle", clip: "Zoro_0000", label: "Provisional combat idle", confidence: "provisional" },
    { id: "special", clip: "Zoro_1330", label: "Charming Demon Sleepless Night Onigiri", confidence: "named" },
  ],
  asuraClip: null,
  phantoms: [],
  weaponStates: [],
};

/** Generated config. It has no character mesh, clip, or texture. */
export const FIXTURE_PREVIEW: PreviewConfig = {
  id: "fixture",
  textureDir: "",
  normalSheets: [],
  alphaTestSheets: [],
  alphaCutOff: 0.5,
  followNodes: ["fixture-bone"],
  idleClip: "fixture-idle",
  attackClip: "fixture-attack",
  mouthMeshIndex: null,
  poseBone: null,
  sheetCandidates: [],
  materialSlotByMesh: null,
  sheetByMesh: {},
  staticMeshIndices: [],
  excludedMeshIndices: [],
  stacks: [],
  swordGroups: [],
  mouthBlade: null,
  handoffSeconds: 0,
  blendSeconds: 0,
  camera: {
    alpha: 0,
    beta: 1,
    idleFactor: 1,
    attackFactor: 1,
    minRadius: 1,
    maxRadius: 10,
    includeDistance: 1,
  },
  stage: {
    clear: [0, 0, 0],
    ground: [0, 0, 0],
    keyIntensity: 0,
    keyDirection: [0, -1, 0],
    rimIntensity: 0,
    rimDirection: [0, -1, 0],
    fogDensity: 0,
  },
  shots: [],
  cinematic: null,
  behaviors: [
    { id: "idle", clip: "fixture-idle", label: "Fixture idle", confidence: "provisional" },
    { id: "action-a", clip: "fixture-action-a", label: "Fixture action A", confidence: "candidate" },
    { id: "action-b", clip: "fixture-action-b", label: "Fixture action B", confidence: "candidate" },
    { id: "reaction", clip: "fixture-reaction", label: "Fixture reaction", confidence: "candidate" },
  ],
  asuraClip: null,
  phantoms: [],
  weaponStates: [],
};

/** Same look as the cinematic file, with the moveset clips that share its skeleton. No cinematic timeline. */
export const ZORO_MOVES_PREVIEW: PreviewConfig = {
  ...ZORO_PREVIEW,
  id: "zoro-moves",
  attackClip: "Zoro_0500",
  cinematic: null,
  behaviors: [
    { id: "idle", clip: "Zoro_0000", label: "Provisional combat idle", confidence: "provisional" },
    { id: "basic", clip: "Zoro_0500", label: "Basic attack candidate", confidence: "candidate" },
    { id: "oni-combo", clip: "Zoro_0650", label: "Combo-order Oni Giri candidate", confidence: "candidate" },
    { id: "asura", clip: "Zoro_1320", label: "Asura main animation", confidence: "named" },
    { id: "reaction", clip: "Zoro_0060", label: "Possible hit or knockback. Not confirmed.", confidence: "candidate" },
  ],
};

/** One local file for the six roster clips plus the two phantom clips. */
export const ZORO_ROSTER_PREVIEW: PreviewConfig = {
  ...ZORO_PREVIEW,
  id: "zoro-roster",
  attackClip: "Zoro_0500",
  cinematic: null,
  asuraClip: "Zoro_1320",
  behaviors: [
    { id: "idle", clip: "Zoro_0000", label: "Provisional combat idle", confidence: "provisional" },
    { id: "basic", clip: "Zoro_0500", label: "Basic attack candidate", confidence: "candidate" },
    { id: "oni-combo", clip: "Zoro_0650", label: "Combo-order Oni Giri candidate", confidence: "candidate" },
    { id: "special", clip: "Zoro_1330", label: "Charming Demon Sleepless Night Onigiri", confidence: "named" },
    { id: "asura", clip: "Zoro_1320", label: "Asura main animation", confidence: "named" },
    { id: "reaction-a", clip: "Zoro_0060", label: "Possible hit or knockback. Not confirmed.", confidence: "candidate" },
    { id: "reaction-b", clip: "Zoro_0061", label: "Possible hit or knockback. Not confirmed.", confidence: "candidate" },
  ],
  phantoms: [
    { clip: "Zoro_1322", offset: [160, 0, 0] },
    { clip: "Zoro_1324", offset: [-160, 0, 0] },
  ],
  weaponStates: [
    {
      clip: "Zoro_0000",
      preset: "all",
      note: "Hands and hip swords stay visible. The mouth blade is not at the face.",
    },
    {
      clip: "Zoro_0500",
      preset: "stacks",
      note: "Hip shells overlap in Show all. This preset hides the lower-vertex copies only while their centers stay together.",
    },
    {
      clip: "Zoro_0650",
      preset: "all",
      note: "Swords spread. No meshes are hidden. Frame the body so the character stays readable.",
    },
    {
      clip: "Zoro_1330",
      preset: "all",
      note: "The mouth blade comes to the face on this clip. Hand and hip groups stay visible.",
    },
    {
      clip: "Zoro_1320",
      preset: "all",
      note: "The main body plays Zoro_1320 only. Phantom copies are a separate control.",
    },
    {
      clip: "Zoro_0060",
      preset: "all",
      note: "Swords leave the hands in this short clip. That is the pose, not a mesh to hide.",
    },
    {
      clip: "Zoro_0061",
      preset: "all",
      note: "Possible reaction. No hide rule.",
    },
  ],
};

/**
 * Sanji roster with extracted idle/basic. Texture sheets under preview/textures/sanji.
 * merge-sanji body meshes are model_0_submesh_N with no Material_N names.
 * materialSlotByMesh was measured from preview/sanji.glb Mesh_N → Material_NN
 * (NOT identity). Identity mapping swapped hair↔skin and face↔cloth on several meshes.
 */
export const SANJI_PREVIEW: PreviewConfig = {
  ...FIXTURE_PREVIEW,
  id: "sanji-roster",
  textureDir: "preview/textures/sanji",
  normalSheets: ["skin", "cloth", "face", "hair"],
  alphaTestSheets: ["hair"],
  alphaCutOff: 0.25,
  followNodes: FOLLOW_NODE_CANDIDATES,
  idleClip: "Sanji_0000",
  attackClip: "Sanji_0500",
  blendSeconds: 0.28,
  // Vertex-matched from preview/sanji.glb Material_NN where counts agree.
  // Noesis mesh 10 (871 verts) has no GLB twin (GLB mesh 10 is 211/Material_12); use cloth slot 10.
  materialSlotByMesh: [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 10, 13, 14, 15, 16, 17, 18, 21, 20, 19, 22, 22, 23, 23, 24, 25, 26, 27, 28,
    29,
  ],
  sheetByMesh: {},
  // Noesis merge also emits tiny driver_* helper meshes; keep them out of the draw list.
  excludedMeshIndices: [],
  behaviors: [
    { id: "idle", clip: "Sanji_0000", label: "Sanji_0000 combat idle candidate", confidence: "candidate" },
    { id: "basic", clip: "Sanji_0500", label: "Sanji_0500 basic attack candidate", confidence: "candidate" },
    { id: "special-a", clip: "Sanji_1290", label: "Sanji_1290 special candidate", confidence: "candidate" },
    { id: "special-b", clip: "Sanji_1300", label: "Sanji_1300 special candidate", confidence: "candidate" },
    { id: "special-c", clip: "Sanji_1310", label: "Sanji_1310 candidate", confidence: "candidate" },
    { id: "special", clip: "Sanji_1330", label: "Sanji_1330 special candidate", confidence: "candidate" },
  ],
};

/**
 * Nami roster. Noesis merge has no Material_N names; materialSlotByMesh is identity into map.json.
 * Sheet assignment is provisional (vertex-count heuristic), reversible via map.json only.
 */
export const NAMI_PREVIEW: PreviewConfig = {
  ...FIXTURE_PREVIEW,
  id: "nami-roster",
  textureDir: "preview/textures/nami",
  normalSheets: [],
  alphaTestSheets: ["hair"],
  alphaCutOff: 0.25,
  followNodes: FOLLOW_NODE_CANDIDATES,
  idleClip: "Nami_0000",
  attackClip: "Nami_NewWorld_0500",
  blendSeconds: 0.28,
  materialSlotByMesh: Array.from({ length: 24 }, (_, index) => index),
  sheetByMesh: {},
  excludedMeshIndices: [],
  behaviors: [
    { id: "idle", clip: "Nami_0000", label: "Nami_0000 idle candidate", confidence: "candidate" },
    { id: "basic", clip: "Nami_NewWorld_0500", label: "Nami_NewWorld_0500 basic candidate", confidence: "candidate" },
    { id: "special", clip: "Nami_NewWorld_1300", label: "Nami_NewWorld_1300 special candidate", confidence: "candidate" },
  ],
};

/**
 * Usopp roster. Same Noesis path as Nami. cloth + cloth01 sheets; map.json is provisional.
 */
export const USOPP_PREVIEW: PreviewConfig = {
  ...FIXTURE_PREVIEW,
  id: "usopp-roster",
  textureDir: "preview/textures/usopp",
  normalSheets: [],
  alphaTestSheets: ["hair"],
  alphaCutOff: 0.25,
  followNodes: FOLLOW_NODE_CANDIDATES,
  idleClip: "Usopp_0000",
  attackClip: "Usopp_0500",
  blendSeconds: 0.28,
  materialSlotByMesh: Array.from({ length: 37 }, (_, index) => index),
  sheetByMesh: {},
  excludedMeshIndices: [],
  behaviors: [
    { id: "idle", clip: "Usopp_0000", label: "Usopp_0000 idle candidate", confidence: "candidate" },
    { id: "basic", clip: "Usopp_0500", label: "Usopp_0500 basic candidate", confidence: "candidate" },
    { id: "special", clip: "Usopp_1300", label: "Usopp_1300 special candidate", confidence: "candidate" },
  ],
};

const PREVIEW_REGISTRY: Record<string, PreviewConfig> = {
  "noesis-present": ZORO_PREVIEW,
  "noesis-moves": ZORO_MOVES_PREVIEW,
  "noesis-roster": ZORO_ROSTER_PREVIEW,
  "noesis-sanji": SANJI_PREVIEW,
  "noesis-nami": NAMI_PREVIEW,
  "noesis-usopp": USOPP_PREVIEW,
  fixture: FIXTURE_PREVIEW,
};

/** Null when the id is not registered. Unknown files do not inherit another character. */
export function previewForAsset(assetId: string): PreviewConfig | null {
  return PREVIEW_REGISTRY[assetId] ?? null;
}

/** Checks the registry without loading a model. */
export function registryCheck(): {
  present: string | null;
  fixture: string | null;
  unknown: boolean;
  fixtureMouth: number | null;
  roster: string | null;
  rosterPhantoms: number;
} {
  const fixture = previewForAsset("fixture");
  const roster = previewForAsset("noesis-roster");
  return {
    present: previewForAsset("noesis-present")?.id ?? null,
    fixture: fixture?.id ?? null,
    unknown: previewForAsset("not-a-character") === null,
    fixtureMouth: fixture?.mouthMeshIndex ?? null,
    roster: roster?.id ?? null,
    rosterPhantoms: roster?.phantoms.length ?? 0,
  };
}

export function meshIndexOf(name: string): number | null {
  // Battle renames meshes to unit-<id>-…; match Mesh_/submesh_ anywhere in the name.
  const hit = /(?:Mesh_|submesh_)(\d+)(?:_|$)/.exec(name);
  return hit ? Number(hit[1]) : null;
}
