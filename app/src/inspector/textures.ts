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
}

export interface TemporaryLook {
  notes: TextureNote[];
  restore: () => void;
}

/**
 * Applies preview/textures/zoro/map.json onto materials named Material_N.
 * The map is the existing reconstructed assignment. It is not the game shader
 * and it is not a recovered material-to-G1T index.
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
  const groups = new Map<string, { material: Material; meshes: Mesh[] }>();

  for (const mesh of meshes) {
    const material = mesh.material;
    if (!material) continue;
    const group = groups.get(material.name) ?? { material, meshes: [] };
    group.meshes.push(mesh);
    groups.set(material.name, group);
  }

  for (const group of groups.values()) {
    const match = /^Material_(\d+)$/.exec(group.material.name);
    const index = match ? Number(match[1]) : null;
    const sheet = index === null ? "" : (assignment[String(index)] ?? "");
    if (!sheet) {
      notes.push({ material: group.material.name, index, sheet: "", normal: false, guessed: false });
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
    const material = new PBRMaterial(`temp-${group.material.name}`, scene);
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
      material: group.material.name,
      index,
      sheet,
      normal: pair.normal !== null,
      guessed: sheet.startsWith("weapon"),
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
