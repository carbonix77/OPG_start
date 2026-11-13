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

/** Per-clip mesh visibility by object name (Blender GLB friendly names). */
export interface ClipMeshOverride {
  show?: string[];
  hide?: string[];
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
  /**
   * Mesh object names hidden by default (Blender hide list). Matched as name suffix.
   */
  excludedMeshNames?: string[];
  /**
   * When set, only meshes whose base name starts with one of these prefixes (case-insensitive) stay visible.
   * Everything else is treated as excluded.
   */
  visibleMeshNamePrefixes?: string[];
  /** Temporary show/hide by mesh name while a clip plays. */
  clipMeshOverrides?: Readonly<Record<string, ClipMeshOverride>>;
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
    { clip: "Zoro_1322", offset: [0, 0, 0] },
    { clip: "Zoro_1324", offset: [0, 0, 0] },
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

/** private-assets/glb/zoro.glb slim named battle set (Idle/Attack/Onigiri/…). */
export const ZORO_GLB_PREVIEW: PreviewConfig = {
  ...ZORO_PREVIEW,
  id: "zoro-glb",
  idleClip: "Idle",
  attackClip: "Attack",
  cinematic: null,
  asuraClip: "Asura_Central",
  excludedMeshIndices: [],
  excludedMeshNames: [
    "Face2",
    "Head_Bandana",
    "Head_Bandana_Knot",
    "Holder_Left_x",
    "Left_Eye",
    "Right_Eye",
    "Sword_Left_Holder",
    "Sword_Right_Holder",
    "Sword_Right_x",
    "model_0_submesh_1_noesis_meshnode_0001",
    "model_0_submesh_5_noesis_meshnode_0005",
    "model_0_submesh_9_noesis_meshnode_0009",
    "model_0_submesh_11_noesis_meshnode_0011",
    "model_0_submesh_14_noesis_meshnode_0014",
    "model_0_submesh_18_noesis_meshnode_0018",
    "model_0_submesh_19_noesis_meshnode_0019",
    "model_0_submesh_20_noesis_meshnode_0020",
    "model_0_submesh_26_noesis_meshnode_0026",
    "model_0_submesh_27_noesis_meshnode_0027",
    "model_0_submesh_29_noesis_meshnode_0029",
    "model_0_submesh_31_noesis_meshnode_0031",
    "model_0_submesh_35_noesis_meshnode_0035",
    "model_0_submesh_37_noesis_meshnode_0037",
    "model_0_submesh_38_noesis_meshnode_0038",
    "model_0_submesh_39_noesis_meshnode_0039",
  ],
  clipMeshOverrides: {
    Idle: {
      hide: ["Sword_Mouth"],
      show: ["Sword_Mouth_Holder"],
    },
    Attack: {
      hide: ["Sword_Mouth"],
      show: ["Sword_Mouth_Holder"],
    },
    Onigiri: {
      hide: ["Sword_Mouth_Holder"],
      show: ["Sword_Mouth"],
    },
    Dragon_Twister: {
      hide: ["Sword_Mouth_Holder"],
      show: ["Sword_Mouth"],
    },
  },
  behaviors: [
    { id: "idle", clip: "Idle", label: "Idle", confidence: "named" },
    { id: "basic", clip: "Attack", label: "Basic Attack", confidence: "named" },
    { id: "special", clip: "Onigiri", label: "Oni Giri", confidence: "named" },
    { id: "special-2", clip: "Dragon_Twister", label: "Dragon Twister", confidence: "named" },
    // Asura kept in GLB / skill def; hidden from battle primarySkills until re-enabled.
    { id: "asura", clip: "Asura_Central", label: "Asura (central + left/right bodies)", confidence: "named" },
    { id: "block", clip: "Block", label: "Block / Guard", confidence: "named" },
    { id: "hit", clip: "Hit", label: "Hit reaction", confidence: "named" },
    { id: "death", clip: "Death", label: "Death", confidence: "named" },
  ],
  phantoms: [
    // Same origin as central body — Asura clones stack, they are not spaced out.
    { clip: "Asura_Left", offset: [0, 0, 0] },
    { clip: "Asura_right", offset: [0, 0, 0] },
  ],
  weaponStates: [],
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
  // Owner hide list: stray shells / wrong-sheet clutter (reversible). driver_* still auto-hidden.
  excludedMeshIndices: [0, 5, 6, 7, 10, 12, 24],
  behaviors: [
    { id: "idle", clip: "Sanji_0000", label: "Sanji_0000 combat idle candidate", confidence: "candidate" },
    { id: "basic", clip: "Sanji_0500", label: "Sanji_0500 basic attack candidate", confidence: "candidate" },
    { id: "special-a", clip: "Sanji_1290", label: "Sanji_1290 special candidate", confidence: "candidate" },
    { id: "special-b", clip: "Sanji_1300", label: "Sanji_1300 special candidate", confidence: "candidate" },
    { id: "special-c", clip: "Sanji_1310", label: "Sanji_1310 candidate", confidence: "candidate" },
    { id: "special", clip: "Sanji_1330", label: "Sanji_1330 special candidate", confidence: "candidate" },
  ],
};

/** private-assets/glb/sanji.glb slim named battle set. */
export const SANJI_GLB_PREVIEW: PreviewConfig = {
  ...SANJI_PREVIEW,
  id: "sanji-glb",
  idleClip: "Idle",
  attackClip: "Attack",
  // Embedded face/hair/skin/cloth in the GLB; do not rebind preview sheet paths.
  textureDir: "",
  materialSlotByMesh: null,
  sheetByMesh: {},
  excludedMeshIndices: [],
  // Noesis shell duplicates (untextured T-pose) + drivers. Named body meshes stay.
  // Include short mesh-datablock names — Babylon may name meshes after those, not node names.
  excludedMeshNames: [
    "driver_0",
    "driver_1",
    "driver_2",
    "driver_3",
    "driver_4",
    "driver_5",
    "driver_0_noesis_meshnode_0032",
    "driver_1_noesis_meshnode_0033",
    "driver_2_noesis_meshnode_0034",
    "driver_3_noesis_meshnode_0035",
    "driver_4_noesis_meshnode_0036",
    "driver_5_noesis_meshnode_0037",
    "model_0_submesh_0",
    "model_0_submesh_1",
    "model_0_submesh_4",
    "model_0_submesh_5",
    "model_0_submesh_6",
    "model_0_submesh_7",
    "model_0_submesh_10",
    "model_0_submesh_11",
    "model_0_submesh_12",
    "model_0_submesh_13",
    "model_0_submesh_14",
    "model_0_submesh_16",
    "model_0_submesh_24",
    "model_0_submesh_25",
    "model_0_submesh_27",
    "model_0_submesh_29",
    "model_0_submesh_30",
    "model_0_submesh_31",
    "model_0_submesh_0_noesis_meshnode_0000",
    "model_0_submesh_1_noesis_meshnode_0001",
    "model_0_submesh_4_noesis_meshnode_0004",
    "model_0_submesh_5_noesis_meshnode_0005",
    "model_0_submesh_6_noesis_meshnode_0006",
    "model_0_submesh_7_noesis_meshnode_0007",
    "model_0_submesh_10_noesis_meshnode_0010",
    "model_0_submesh_11_noesis_meshnode_0011",
    "model_0_submesh_12_noesis_meshnode_0012",
    "model_0_submesh_13_noesis_meshnode_0013",
    "model_0_submesh_14_noesis_meshnode_0014",
    "model_0_submesh_16_noesis_meshnode_0016",
    "model_0_submesh_24_noesis_meshnode_0024",
    "model_0_submesh_25_noesis_meshnode_0025",
    "model_0_submesh_27_noesis_meshnode_0027",
    "model_0_submesh_29_noesis_meshnode_0029",
    "model_0_submesh_30_noesis_meshnode_0030",
    "model_0_submesh_31_noesis_meshnode_0031",
  ],
  behaviors: [
    { id: "idle", clip: "Idle", label: "Idle", confidence: "named" },
    { id: "basic", clip: "Attack", label: "Basic Attack", confidence: "named" },
    {
      id: "special",
      clip: "Diable_Jambe_1",
      label: "Diable Jambe (1→4 in order)",
      confidence: "named",
    },
    {
      id: "special-2",
      clip: "Party_Table_Kick_Course_1",
      label: "Party Table Kick Course (1→3 in order)",
      confidence: "named",
    },
    { id: "block", clip: "Block", label: "Block / Guard", confidence: "named" },
    { id: "hit", clip: "Hit", label: "Hit reaction", confidence: "named" },
    { id: "death", clip: "Death", label: "Death", confidence: "named" },
  ],
  phantoms: [],
  weaponStates: [],
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
  // Owner hide list: accessory / wrong-sheet shells (reversible).
  excludedMeshIndices: [4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 18, 20, 23],
  behaviors: [
    { id: "idle", clip: "Nami_0000", label: "Nami_0000 idle candidate", confidence: "candidate" },
    { id: "basic", clip: "Nami_NewWorld_0500", label: "Nami_NewWorld_0500 basic candidate", confidence: "candidate" },
    { id: "special", clip: "Nami_NewWorld_1300", label: "Nami_NewWorld_1300 special candidate", confidence: "candidate" },
  ],
};

/** private-assets/glb/nami.glb slim named battle set. */
export const NAMI_GLB_PREVIEW: PreviewConfig = {
  ...NAMI_PREVIEW,
  id: "nami-glb",
  idleClip: "Idle",
  attackClip: "Attack",
  textureDir: "",
  materialSlotByMesh: null,
  sheetByMesh: {},
  excludedMeshIndices: [],
  excludedMeshNames: [
    "model_0_submesh_0",
    "model_0_submesh_1",
    "model_0_submesh_4",
    "model_0_submesh_5",
    "model_0_submesh_6",
    "model_0_submesh_7",
    "model_0_submesh_8",
    "model_0_submesh_9",
    "model_0_submesh_12",
    "model_0_submesh_13",
    "model_0_submesh_17",
    "model_0_submesh_19",
    "model_0_submesh_20",
    "model_0_submesh_22",
    "model_0_submesh_23",
    "model_0_submesh_0_noesis_meshnode_0000",
    "model_0_submesh_1_noesis_meshnode_0001",
    "model_0_submesh_4_noesis_meshnode_0004",
    "model_0_submesh_5_noesis_meshnode_0005",
    "model_0_submesh_6_noesis_meshnode_0006",
    "model_0_submesh_7_noesis_meshnode_0007",
    "model_0_submesh_8_noesis_meshnode_0008",
    "model_0_submesh_9_noesis_meshnode_0009",
    "model_0_submesh_12_noesis_meshnode_0012",
    "model_0_submesh_13_noesis_meshnode_0013",
    "model_0_submesh_17_noesis_meshnode_0017",
    "model_0_submesh_19_noesis_meshnode_0019",
    "model_0_submesh_20_noesis_meshnode_0020",
    "model_0_submesh_22_noesis_meshnode_0022",
    "model_0_submesh_23_noesis_meshnode_0023",
  ],
  behaviors: [
    { id: "idle", clip: "Idle", label: "Idle", confidence: "named" },
    { id: "basic", clip: "Attack", label: "Basic Attack", confidence: "named" },
    { id: "special", clip: "Thunderbolt_Tempo", label: "Thunderbolt Tempo", confidence: "named" },
    { id: "special-2", clip: "Cyclone_Tempo", label: "Cyclone Tempo", confidence: "named" },
    { id: "block", clip: "Block", label: "Block / Guard", confidence: "named" },
    { id: "hit", clip: "Hit", label: "Hit reaction", confidence: "named" },
    { id: "death", clip: "Death", label: "Death", confidence: "named" },
  ],
  phantoms: [],
  weaponStates: [],
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
  // Owner hide list: accessory / wrong-sheet shells (reversible). driver_* still auto-hidden.
  excludedMeshIndices: [0, 4, 9, 10, 11, 12, 13, 14, 16, 17, 19, 20, 21, 24, 31, 33, 35],
  behaviors: [
    { id: "idle", clip: "Usopp_0000", label: "Usopp_0000 idle candidate", confidence: "candidate" },
    { id: "basic", clip: "Usopp_0500", label: "Usopp_0500 basic candidate", confidence: "candidate" },
    { id: "special", clip: "Usopp_1300", label: "Usopp_1300 special candidate", confidence: "candidate" },
  ],
};

/** private-assets/glb/usopp.glb slim named battle set. */
export const USOPP_GLB_PREVIEW: PreviewConfig = {
  ...USOPP_PREVIEW,
  id: "usopp-glb",
  idleClip: "Idle",
  attackClip: "Attack",
  textureDir: "",
  materialSlotByMesh: null,
  sheetByMesh: {},
  excludedMeshIndices: [],
  excludedMeshNames: [
    "driver_0_noesis_meshnode_0037",
    "driver_1_noesis_meshnode_0038",
    "driver_2_noesis_meshnode_0039",
    "driver_3_noesis_meshnode_0040",
    "driver_4_noesis_meshnode_0041",
    "driver_5_noesis_meshnode_0042",
    "model_0_submesh_0",
    "model_0_submesh_2",
    "model_0_submesh_4",
    "model_0_submesh_8",
    "model_0_submesh_9",
    "model_0_submesh_10",
    "model_0_submesh_11",
    "model_0_submesh_12",
    "model_0_submesh_13",
    "model_0_submesh_14",
    "model_0_submesh_16",
    "model_0_submesh_17",
    "model_0_submesh_18",
    "model_0_submesh_19",
    "model_0_submesh_20",
    "model_0_submesh_21",
    "model_0_submesh_22",
    "model_0_submesh_23",
    "model_0_submesh_25",
    "model_0_submesh_26",
    "model_0_submesh_27",
    "model_0_submesh_31",
    "model_0_submesh_33",
    "model_0_submesh_35",
    "model_0_submesh_36",
    "model_0_submesh_0_noesis_meshnode_0000",
    "model_0_submesh_2_noesis_meshnode_0002",
    "model_0_submesh_4_noesis_meshnode_0004",
    "model_0_submesh_8_noesis_meshnode_0008",
    "model_0_submesh_9_noesis_meshnode_0009",
    "model_0_submesh_10_noesis_meshnode_0010",
    "model_0_submesh_11_noesis_meshnode_0011",
    "model_0_submesh_12_noesis_meshnode_0012",
    "model_0_submesh_13_noesis_meshnode_0013",
    "model_0_submesh_14_noesis_meshnode_0014",
    "model_0_submesh_16_noesis_meshnode_0016",
    "model_0_submesh_17_noesis_meshnode_0017",
    "model_0_submesh_18_noesis_meshnode_0018",
    "model_0_submesh_19_noesis_meshnode_0019",
    "model_0_submesh_20_noesis_meshnode_0020",
    "model_0_submesh_21_noesis_meshnode_0021",
    "model_0_submesh_22_noesis_meshnode_0022",
    "model_0_submesh_23_noesis_meshnode_0023",
    "model_0_submesh_25_noesis_meshnode_0025",
    "model_0_submesh_26_noesis_meshnode_0026",
    "model_0_submesh_27_noesis_meshnode_0027",
    "model_0_submesh_31_noesis_meshnode_0031",
    "model_0_submesh_33_noesis_meshnode_0033",
    "model_0_submesh_35_noesis_meshnode_0035",
    "model_0_submesh_36_noesis_meshnode_0036",
  ],
  behaviors: [
    { id: "idle", clip: "Idle", label: "Idle", confidence: "named" },
    { id: "basic", clip: "Attack", label: "Basic Attack", confidence: "named" },
    { id: "special", clip: "Fire_Star", label: "Fire Star", confidence: "named" },
    { id: "special-2", clip: "Sunflower_Star", label: "Sunflower Star", confidence: "named" },
    { id: "block", clip: "Block", label: "Block / Guard", confidence: "named" },
    { id: "hit", clip: "Hit", label: "Hit reaction", confidence: "named" },
    { id: "death", clip: "Death", label: "Death", confidence: "named" },
  ],
  phantoms: [],
  weaponStates: [],
};

/** private-assets/glb/ace.glb slim named battle set. */
export const ACE_GLB_PREVIEW: PreviewConfig = {
  ...FIXTURE_PREVIEW,
  id: "ace-glb",
  idleClip: "Idle",
  attackClip: "Attack",
  blendSeconds: 0.28,
  textureDir: "",
  materialSlotByMesh: null,
  sheetByMesh: {},
  excludedMeshIndices: [],
  excludedMeshNames: [
    "Icosphere",
    "driver_0",
    "driver_1",
    "driver_2",
    "driver_3",
    "driver_4",
    "driver_5",
    "driver_0_noesis_meshnode_0032",
    "driver_1_noesis_meshnode_0033",
    "driver_2_noesis_meshnode_0034",
    "driver_3_noesis_meshnode_0035",
    "driver_4_noesis_meshnode_0036",
    "driver_5_noesis_meshnode_0037",
    "model_0_submesh_1",
    "model_0_submesh_2",
    "model_0_submesh_3",
    "model_0_submesh_5",
    "model_0_submesh_6",
    "model_0_submesh_10",
    "model_0_submesh_11",
    "model_0_submesh_12",
    "model_0_submesh_18",
    "model_0_submesh_19",
    "model_0_submesh_26",
    "model_0_submesh_28",
    "model_0_submesh_29",
    "model_0_submesh_30",
    "model_0_submesh_31",
    "model_0_submesh_1_noesis_meshnode_0001",
    "model_0_submesh_2_noesis_meshnode_0002",
    "model_0_submesh_3_noesis_meshnode_0003",
    "model_0_submesh_5_noesis_meshnode_0005",
    "model_0_submesh_6_noesis_meshnode_0006",
    "model_0_submesh_10_noesis_meshnode_0010",
    "model_0_submesh_11_noesis_meshnode_0011",
    "model_0_submesh_12_noesis_meshnode_0012",
    "model_0_submesh_18_noesis_meshnode_0018",
    "model_0_submesh_19_noesis_meshnode_0019",
    "model_0_submesh_26_noesis_meshnode_0026",
    "model_0_submesh_28_noesis_meshnode_0028",
    "model_0_submesh_29_noesis_meshnode_0029",
    "model_0_submesh_30_noesis_meshnode_0030",
    "model_0_submesh_31_noesis_meshnode_0031",
  ],
  behaviors: [
    { id: "idle", clip: "Idle", label: "Idle", confidence: "named" },
    { id: "basic", clip: "Attack", label: "Basic Attack", confidence: "named" },
    { id: "special", clip: "Fire_Fist", label: "Fire Fist", confidence: "named" },
    { id: "special-2", clip: "Flame_Emperor", label: "Flame Emperor", confidence: "named" },
    { id: "block", clip: "Block", label: "Block / Guard", confidence: "named" },
    { id: "hit", clip: "Hit", label: "Hit reaction", confidence: "named" },
    { id: "death", clip: "Death", label: "Death", confidence: "named" },
  ],
  phantoms: [],
  weaponStates: [],
};

/** private-assets/glb/brook.glb slim named battle set. */
export const BROOK_GLB_PREVIEW: PreviewConfig = {
  ...FIXTURE_PREVIEW,
  id: "brook-glb",
  idleClip: "Idle",
  attackClip: "Attack",
  blendSeconds: 0.28,
  textureDir: "",
  materialSlotByMesh: null,
  sheetByMesh: {},
  excludedMeshIndices: [],
  // Violeen + Guitar always off. Holder2 off unless Attack / Arrow_Notch / Polka_Remise show it.
  excludedMeshNames: [
    "Icosphere",
    "Violeen",
    "Guitar",
    "Holder2",
    "driver_0",
    "driver_1",
    "driver_2",
    "driver_3",
    "driver_4",
    "driver_5",
    "driver_0_noesis_meshnode_0012",
    "driver_1_noesis_meshnode_0013",
    "driver_2_noesis_meshnode_0014",
    "driver_3_noesis_meshnode_0015",
    "driver_4_noesis_meshnode_0016",
    "driver_5_noesis_meshnode_0017",
  ],
  clipMeshOverrides: {
    Idle: {
      hide: ["Violeen", "Guitar", "Holder2"],
    },
    Attack: {
      hide: ["Violeen", "Guitar", "Holder"],
      show: ["Holder2"],
    },
    Block: {
      hide: ["Violeen", "Guitar", "Holder2"],
    },
    Hit: {
      hide: ["Violeen", "Guitar", "Holder2"],
    },
    Death: {
      hide: ["Violeen", "Guitar", "Holder2"],
    },
    Arrow_Notch: {
      hide: ["Violeen", "Guitar", "Holder"],
      show: ["Holder2"],
    },
    Polka_Remise: {
      hide: ["Violeen", "Guitar", "Holder"],
      show: ["Holder2"],
    },
  },
  behaviors: [
    { id: "idle", clip: "Idle", label: "Idle", confidence: "named" },
    { id: "basic", clip: "Attack", label: "Basic Attack", confidence: "named" },
    { id: "special", clip: "Arrow_Notch", label: "Arrow Notch Slash", confidence: "named" },
    { id: "special-2", clip: "Polka_Remise", label: "Polka Remise", confidence: "named" },
    { id: "block", clip: "Block", label: "Block / Guard", confidence: "named" },
    { id: "hit", clip: "Hit", label: "Hit reaction", confidence: "named" },
    { id: "death", clip: "Death", label: "Death", confidence: "named" },
  ],
  phantoms: [],
  weaponStates: [],
};

/** private-assets/glb/chopper.glb slim named battle set (brain-point / chopper1 form only). */
export const CHOPPER_GLB_PREVIEW: PreviewConfig = {
  ...FIXTURE_PREVIEW,
  id: "chopper-glb",
  idleClip: "Idle",
  attackClip: "Attack",
  blendSeconds: 0.28,
  textureDir: "",
  materialSlotByMesh: null,
  sheetByMesh: {},
  excludedMeshIndices: [],
  excludedMeshNames: ["Icosphere", "Hooves"],
  // User: only copper1* — blend also uses chopper1* / Chopper1* for the same form.
  visibleMeshNamePrefixes: ["copper1", "chopper1"],
  behaviors: [
    { id: "idle", clip: "Idle", label: "Idle", confidence: "named" },
    { id: "basic", clip: "Attack", label: "Basic Attack", confidence: "named" },
    { id: "special", clip: "Cure", label: "Cure", confidence: "named" },
    { id: "special-2", clip: "Im_A_Doctor", label: "I'm a Doctor", confidence: "named" },
    { id: "block", clip: "Block", label: "Block / Guard", confidence: "named" },
    { id: "hit", clip: "Hit", label: "Hit reaction", confidence: "named" },
    { id: "death", clip: "Death", label: "Death", confidence: "named" },
  ],
  phantoms: [],
  weaponStates: [],
};

/** private-assets/glb/robin.glb slim named battle set. */
export const ROBIN_GLB_PREVIEW: PreviewConfig = {
  ...FIXTURE_PREVIEW,
  id: "robin-glb",
  idleClip: "Idle",
  attackClip: "Attack",
  blendSeconds: 0.28,
  textureDir: "",
  materialSlotByMesh: null,
  sheetByMesh: {},
  excludedMeshIndices: [],
  excludedMeshNames: [
    "Icosphere",
    "driver_0",
    "driver_1",
    "driver_2",
    "driver_3",
    "driver_4",
    "driver_5",
    "driver_6",
    "driver_7",
    "driver_8",
    "driver_9",
    "driver_10",
    "driver_11",
    "driver_12",
    "driver_13",
    "driver_14",
    "driver_15",
    "driver_16",
    "driver_17",
    "driver_0_noesis_meshnode_0020",
    "driver_1_noesis_meshnode_0021",
    "driver_2_noesis_meshnode_0022",
    "driver_3_noesis_meshnode_0023",
    "driver_4_noesis_meshnode_0024",
    "driver_5_noesis_meshnode_0025",
    "driver_6_noesis_meshnode_0026",
    "driver_7_noesis_meshnode_0027",
    "driver_8_noesis_meshnode_0028",
    "driver_9_noesis_meshnode_0029",
    "driver_10_noesis_meshnode_0030",
    "driver_11_noesis_meshnode_0031",
    "driver_12_noesis_meshnode_0032",
    "driver_13_noesis_meshnode_0033",
    "driver_14_noesis_meshnode_0034",
    "driver_15_noesis_meshnode_0035",
    "driver_16_noesis_meshnode_0036",
    "driver_17_noesis_meshnode_0037",
    "model_0_submesh_0",
    "model_0_submesh_2",
    "model_0_submesh_3",
    "model_0_submesh_5",
    "model_0_submesh_6",
    "model_0_submesh_7",
    "model_0_submesh_8",
    "model_0_submesh_15",
    "model_0_submesh_16",
    "model_0_submesh_17",
    "model_0_submesh_0_noesis_meshnode_0000",
    "model_0_submesh_2_noesis_meshnode_0002",
    "model_0_submesh_3_noesis_meshnode_0003",
    "model_0_submesh_5_noesis_meshnode_0005",
    "model_0_submesh_6_noesis_meshnode_0006",
    "model_0_submesh_7_noesis_meshnode_0007",
    "model_0_submesh_8_noesis_meshnode_0008",
    "model_0_submesh_15_noesis_meshnode_0015",
    "model_0_submesh_16_noesis_meshnode_0016",
    "model_0_submesh_17_noesis_meshnode_0017",
  ],
  behaviors: [
    { id: "idle", clip: "Idle", label: "Idle", confidence: "named" },
    { id: "basic", clip: "Attack", label: "Basic Attack", confidence: "named" },
    { id: "special", clip: "Clutch_1", label: "Clutch (1→7 in order)", confidence: "named" },
    { id: "special-2", clip: "Rondo", label: "Rondo", confidence: "named" },
    { id: "block", clip: "Block", label: "Block / Guard", confidence: "named" },
    { id: "hit", clip: "Hit", label: "Hit reaction", confidence: "named" },
    { id: "death", clip: "Death", label: "Death", confidence: "named" },
  ],
  phantoms: [],
  weaponStates: [],
};

/** private-assets/glb/franky.glb slim named battle set. */
export const FRANKY_GLB_PREVIEW: PreviewConfig = {
  ...FIXTURE_PREVIEW,
  id: "franky-glb",
  idleClip: "Idle",
  attackClip: "Attack",
  blendSeconds: 0.28,
  textureDir: "",
  materialSlotByMesh: null,
  sheetByMesh: {},
  excludedMeshIndices: [],
  // weapon4 excluded by default (shown on Radical Beam). Fists stay in the keep set.
  excludedMeshNames: [
    "Icosphere",
    "weapon4",
    "driver_0",
    "driver_1",
    "driver_2",
    "driver_0_noesis_meshnode_0040",
    "driver_1_noesis_meshnode_0041",
    "driver_2_noesis_meshnode_0042",
    "model_0_submesh_1",
    "model_0_submesh_3",
    "model_0_submesh_5",
    "model_0_submesh_8",
    "model_0_submesh_9",
    "model_0_submesh_10",
    "model_0_submesh_11",
    "model_0_submesh_14",
    "model_0_submesh_18",
    "model_0_submesh_23",
    "model_0_submesh_24",
    "model_0_submesh_25",
    "model_0_submesh_26",
    "model_0_submesh_27",
    "model_0_submesh_28",
    "model_0_submesh_29",
    "model_0_submesh_33",
    "model_0_submesh_34",
    "model_0_submesh_1_noesis_meshnode_0001",
    "model_0_submesh_3_noesis_meshnode_0003",
    "model_0_submesh_5_noesis_meshnode_0005",
    "model_0_submesh_8_noesis_meshnode_0008",
    "model_0_submesh_9_noesis_meshnode_0009",
    "model_0_submesh_10_noesis_meshnode_0010",
    "model_0_submesh_11_noesis_meshnode_0011",
    "model_0_submesh_14_noesis_meshnode_0014",
    "model_0_submesh_18_noesis_meshnode_0018",
    "model_0_submesh_23_noesis_meshnode_0023",
    "model_0_submesh_24_noesis_meshnode_0024",
    "model_0_submesh_25_noesis_meshnode_0025",
    "model_0_submesh_26_noesis_meshnode_0026",
    "model_0_submesh_27_noesis_meshnode_0027",
    "model_0_submesh_28_noesis_meshnode_0028",
    "model_0_submesh_29_noesis_meshnode_0029",
    "model_0_submesh_33_noesis_meshnode_0033",
    "model_0_submesh_34_noesis_meshnode_0034",
  ],
  // right_fist2 / right_fist_3 always on; weapon4 only during Radical Beam.
  clipMeshOverrides: {
    Idle: { hide: ["weapon4"], show: ["right_fist2", "right_fist_3"] },
    Attack: { hide: ["weapon4"], show: ["right_fist2", "right_fist_3"] },
    Block: { hide: ["weapon4"], show: ["right_fist2", "right_fist_3"] },
    Hit: { hide: ["weapon4"], show: ["right_fist2", "right_fist_3"] },
    Death: { hide: ["weapon4"], show: ["right_fist2", "right_fist_3"] },
    Strong_Right: { hide: ["weapon4"], show: ["right_fist2", "right_fist_3"] },
    Radical_Beam_1: { show: ["weapon4", "right_fist2", "right_fist_3"] },
    Radical_Beam_2: { show: ["weapon4", "right_fist2", "right_fist_3"] },
  },
  behaviors: [
    { id: "idle", clip: "Idle", label: "Idle", confidence: "named" },
    { id: "basic", clip: "Attack", label: "Basic Attack", confidence: "named" },
    { id: "special", clip: "Radical_Beam_1", label: "Radical Beam (1→2)", confidence: "named" },
    { id: "special-2", clip: "Strong_Right", label: "Strong Right", confidence: "named" },
    { id: "block", clip: "Block", label: "Block / Guard", confidence: "named" },
    { id: "hit", clip: "Hit", label: "Hit reaction", confidence: "named" },
    { id: "death", clip: "Death", label: "Death", confidence: "named" },
  ],
  phantoms: [],
  weaponStates: [],
};

/** private-assets/glb/luffy.glb slim named battle set. */
export const LUFFY_GLB_PREVIEW: PreviewConfig = {
  ...FIXTURE_PREVIEW,
  id: "luffy-glb",
  idleClip: "Idle",
  attackClip: "Attack",
  blendSeconds: 0.28,
  textureDir: "",
  materialSlotByMesh: null,
  sheetByMesh: {},
  excludedMeshIndices: [],
  excludedMeshNames: [
    "Icosphere",
    "Face_x",
    "back_hat_strings",
    "hat_back",
    "spring_leggs",
  ],
  behaviors: [
    { id: "idle", clip: "Idle", label: "Idle", confidence: "named" },
    { id: "basic", clip: "Attack", label: "Basic Attack", confidence: "named" },
    { id: "special", clip: "Bazooka", label: "Gomu Gomu no Bazooka", confidence: "named" },
    { id: "special-2", clip: "Gattling", label: "Gomu Gomu no Gattling", confidence: "named" },
    { id: "block", clip: "Block", label: "Block / Guard", confidence: "named" },
    { id: "hit", clip: "Hit", label: "Hit reaction", confidence: "named" },
    { id: "death", clip: "Death", label: "Death", confidence: "named" },
  ],
  phantoms: [],
  weaponStates: [],
};

const PREVIEW_REGISTRY: Record<string, PreviewConfig> = {
  "noesis-present": ZORO_PREVIEW,
  "noesis-moves": ZORO_MOVES_PREVIEW,
  "noesis-roster": ZORO_ROSTER_PREVIEW,
  "noesis-sanji": SANJI_PREVIEW,
  "noesis-nami": NAMI_PREVIEW,
  "noesis-usopp": USOPP_PREVIEW,
  "glb-zoro": ZORO_GLB_PREVIEW,
  "glb-sanji": SANJI_GLB_PREVIEW,
  "glb-nami": NAMI_GLB_PREVIEW,
  "glb-usopp": USOPP_GLB_PREVIEW,
  "glb-ace": ACE_GLB_PREVIEW,
  "glb-brook": BROOK_GLB_PREVIEW,
  "glb-chopper": CHOPPER_GLB_PREVIEW,
  "glb-robin": ROBIN_GLB_PREVIEW,
  "glb-franky": FRANKY_GLB_PREVIEW,
  "glb-luffy": LUFFY_GLB_PREVIEW,
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
