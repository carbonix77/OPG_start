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
  label: string;
  clip: "idle" | "attack";
  normalized: number;
  alpha: number;
  beta: number;
  /** Fixed orbit radius. Null uses the fitted radius. */
  radius: number | null;
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
  };
  shots: PreviewShot[];
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
    clear: [0.07, 0.08, 0.11],
    ground: [0.1, 0.11, 0.13],
    keyIntensity: 1.15,
    keyDirection: [-0.25, -1, -0.45],
    rimIntensity: 0.55,
    rimDirection: [0.7, -0.35, 0.6],
  },
  shots: [
    {
      id: "idle-wide",
      label: "Stage idle. Preview lighting, not a game effect.",
      clip: "idle",
      normalized: 0,
      alpha: Math.PI / 2,
      beta: 1.15,
      radius: 520,
    },
    {
      id: "attack-wide",
      label: "Stage attack at 0.35. Preview lighting, not a game effect.",
      clip: "attack",
      normalized: 0.35,
      alpha: Math.PI / 2 + 0.4,
      beta: 1.05,
      radius: 640,
    },
  ],
};

export function previewForAsset(_assetId: string): PreviewConfig {
  return ZORO_PREVIEW;
}

export function meshIndexOf(name: string): number | null {
  const hit = /(?:^Mesh_|submesh_)(\d+)(?:_|$)/.exec(name);
  return hit ? Number(hit[1]) : null;
}
