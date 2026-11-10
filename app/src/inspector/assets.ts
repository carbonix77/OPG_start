export interface LocalAsset {
  id: string;
  label: string;
  relativePath: string;
  note: string;
}

/** Local files. None of these paths are committed. */
export const LOCAL_ASSETS: LocalAsset[] = [
  {
    id: "existing-glb",
    label: "Existing GLB",
    relativePath: "preview/zoro.glb",
    note: "bone_N names, four clips, 37 materials, no embedded images",
  },
  {
    id: "noesis-1330",
    label: "Noesis glTF 1330",
    relativePath: "private-assets/validation/merge-1330/merged-b.gltf",
    note: "oid bone names, Zoro_1330 only, no textures",
  },
  {
    id: "noesis-asura",
    label: "Noesis glTF Asura",
    relativePath: "private-assets/validation/merge-1320/merged.gltf",
    note: "Zoro_1320, Zoro_1322, and Zoro_1324 are separate clips",
  },
  {
    id: "noesis-idle",
    label: "Noesis glTF unnamed candidates",
    relativePath: "private-assets/validation/merge-idle/merged.gltf",
    note: "Unnamed Zoro_0000, 0001, 0051, 0060, and 0061. Not a confirmed idle or hit.",
  },
];

export function assetUrl(relativePath: string): { rootUrl: string; fileName: string } {
  const full = `${__REPO_ROOT__}/${relativePath}`.replace(/\\/g, "/");
  const url = `/@fs/${full}`;
  const slash = url.lastIndexOf("/");
  return { rootUrl: url.slice(0, slash + 1), fileName: url.slice(slash + 1) };
}

export function fileUrl(relativePath: string): string {
  const { rootUrl, fileName } = assetUrl(relativePath);
  return rootUrl + fileName;
}
