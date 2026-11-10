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
  staticMeshIndices: number[];
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
}

export const FOLLOW_NODE_CANDIDATES = ["SK_Skeleton", "bone_1", "bone_0"];

/**
 * Measured on the Noesis present file.
 * Mesh 17 and 27 stay within 0.28 at the sampled times and both skin to one weapon bone.
 * Meshes 30, 33, and 39 stay within 0.44 and skin to the other weapon bone.
 * The distance 1 is above those gaps. It is not a rule from the game.
 * Mesh 36 is skinned to a child of the head bone. Its sheet stays the reconstructed map.
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
  staticMeshIndices: [3, 22, 23, 24],
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
};

export function previewForAsset(_assetId: string): PreviewConfig {
  return ZORO_PREVIEW;
}

export function meshIndexOf(name: string): number | null {
  const hit = /(?:^Mesh_|submesh_)(\d+)(?:_|$)/.exec(name);
  return hit ? Number(hit[1]) : null;
}
