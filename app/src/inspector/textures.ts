import { PBRMaterial, Texture, type Material, type Mesh, type Scene } from "@babylonjs/core";
import { fileUrl } from "./assets";

/** Sheets that have a sibling `_n.png` in preview/textures/zoro. Sword sheets do not. */
const NORMAL_SHEETS = new Set(["skin", "cloth", "face", "hair"]);

export interface TextureNote {
  material: string;
  index: number | null;
  sheet: string;
  normal: boolean;
  /** weapon00–weapon04 in map.json were assigned by eye, not from a recovered material index. */
  guessed: boolean;
  /** material-name uses Material_N. mesh-index copies the GLB slot after the vertex counts matched. */
  via: "material-name" | "mesh-index";
}

/**
 * GLB primitive material slot for mesh index N.
 * Noesis submesh N has the same vertex count. This is not a recovered G1T index.
 * Slots 11/12 and 20/21 are swapped. Material 20 is shared by meshes 21–24.
 */
const GLB_MATERIAL_BY_MESH = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 11, 13, 14, 15, 16, 17, 18, 19, 21, 20, 20, 20, 20, 22, 23, 24, 25, 26, 27, 28,
  29, 30, 31, 32, 33, 34, 35, 36,
];

export interface TemporaryLook {
  notes: TextureNote[];
  restore: () => void;
}

/**
 * Applies preview/textures/zoro/map.json.
 * Materials named Material_N use that number.
 * Other meshes use the GLB material slot of the same mesh index when the vertex counts match.
 * The map is reconstructed. It is not the game shader and it is not a recovered G1T index.
 * UV invertY is false, matching the glTF meshes and the older viewer.
 * Normals use Babylon's DirectX reader, so OpenGL-style maps set invertNormalMapY.
 */
export async function applyTemporaryLook(scene: Scene, meshes: Mesh[]): Promise<TemporaryLook> {
  const response = await fetch(fileUrl("preview/textures/zoro/map.json"));
  if (!response.ok) throw new Error(`texture map HTTP ${response.status}`);
  const assignment = (await response.json()) as Record<string, string>;
  const images = new Map<string, { albedo: Texture; normal: Texture | null }>();
  const created: PBRMaterial[] = [];
  const previous = new Map<Mesh, Material | null>();
  const notes: TextureNote[] = [];
  const groups = new Map<string, { label: string; index: number | null; via: TextureNote["via"]; meshes: Mesh[] }>();

  for (const mesh of meshes) {
    const named = mesh.material ? /^Material_(\d+)$/.exec(mesh.material.name) : null;
    const meshIndex = /(?:^Mesh_|submesh_)(\d+)(?:_|$)/.exec(mesh.name);
    const via: TextureNote["via"] = named ? "material-name" : "mesh-index";
    const index = named
      ? Number(named[1])
      : meshIndex
        ? (GLB_MATERIAL_BY_MESH[Number(meshIndex[1])] ?? null)
        : null;
    const key = `${via}:${index ?? "none"}`;
    const group = groups.get(key) ?? { label: mesh.material?.name ?? mesh.name, index, via, meshes: [] };
    group.meshes.push(mesh);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    const index = group.index;
    const sheet = index === null ? "" : (assignment[String(index)] ?? "");
    if (!sheet) {
      notes.push({ material: group.label, index, sheet: "", normal: false, guessed: false, via: group.via });
      continue;
    }
    let pair = images.get(sheet);
    if (!pair) {
      const albedo = new Texture(fileUrl(`preview/textures/zoro/${sheet}.png`), scene, false, false);
      albedo.gammaSpace = true;
      let normal: Texture | null = null;
      if (NORMAL_SHEETS.has(sheet)) {
        normal = new Texture(fileUrl(`preview/textures/zoro/${sheet}_n.png`), scene, false, false);
        normal.gammaSpace = false;
      }
      pair = { albedo, normal };
      images.set(sheet, pair);
    }
    const material = new PBRMaterial(`temp-${group.via}-${index}`, scene);
    material.albedoTexture = pair.albedo;
    material.metallic = 0;
    material.roughness = 0.85;
    material.backFaceCulling = false;
    material.twoSidedLighting = true;
    if (pair.normal) {
      material.bumpTexture = pair.normal;
      material.invertNormalMapY = true;
    }
    if (sheet === "hair") {
      material.useAlphaFromAlbedoTexture = true;
      material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHATEST;
      material.alphaCutOff = 0.25;
    }
    created.push(material);
    for (const mesh of group.meshes) {
      previous.set(mesh, mesh.material);
      mesh.material = material;
    }
    notes.push({
      material: group.label,
      index,
      sheet,
      normal: pair.normal !== null,
      guessed: sheet.startsWith("weapon"),
      via: group.via,
    });
  }

  return {
    notes,
    restore: () => {
      for (const [mesh, material] of previous) {
        if (!mesh.isDisposed()) mesh.material = material;
      }
      for (const material of created) material.dispose(false, false);
      for (const pair of images.values()) {
        pair.albedo.dispose();
        pair.normal?.dispose();
      }
      previous.clear();
    },
  };
}
