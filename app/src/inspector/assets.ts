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
    note: "Zoro_0000 and 0001: unnamed in-place combat stance, idle candidate, not verified. Zoro_0060 and 0061: possible reactions, not verified hits. Zoro_0051 is a separate unnamed clip.",
  },
  {
    id: "noesis-quiet",
    label: "Noesis glTF quieter unnamed clips",
    relativePath: "private-assets/validation/merge-quiet/merged.gltf",
    note: "Unnamed Zoro_0165, Zoro_0006, and Zoro_0003. Small reconstructed root travel. Not verified idle or hit.",
  },
  {
    id: "noesis-present",
    label: "Noesis glTF provisional idle and 1330",
    relativePath: "private-assets/validation/merge-present/merged.gltf",
    note: "Zoro_0000 and Zoro_1330 on SK_Skeleton. Provisional preview only. Textures use the matched GLB slots. Not retargeted onto the GLB.",
  },
  {
    id: "noesis-moves",
    label: "Noesis glTF moveset candidates",
    relativePath: "private-assets/validation/merge-moves/merged.gltf",
    note: "Zoro_0000 with Zoro_0500, Zoro_0650, Zoro_0060, and Zoro_1320 on one skeleton. Names stay candidates until playback. Not retargeted.",
  },
  {
    id: "noesis-roster",
    label: "Noesis glTF roster",
    relativePath: "private-assets/validation/merge-roster/merged.gltf",
    note: "One skeleton: provisional combat idle Zoro_0000, basic attack candidate Zoro_0500, combo-order Oni Giri candidate Zoro_0650, Charming Demon Sleepless Night Onigiri Zoro_1330, Asura main Zoro_1320, and possible reactions Zoro_0060 and Zoro_0061. Zoro_1322 and Zoro_1324 are phantom clips, not extra meshes. Not retargeted.",
  },
  {
    id: "noesis-next",
    label: "Noesis glTF next unnamed clips",
    relativePath: "private-assets/validation/merge-next/merged.gltf",
    note: "Unnamed Zoro_0050, 0071, 0604, and 1650. Not verified idle or hit.",
  },
  {
    id: "noesis-sanji",
    label: "Noesis glTF Sanji roster",
    relativePath: "private-assets/validation/merge-sanji/merged.gltf",
    note: "Sanji_0000 idle, Sanji_0500 basic, plus specials 1290/1300/1310/1330 on one skeleton. Not retargeted.",
  },
  {
    id: "noesis-nami",
    label: "Noesis glTF Nami roster",
    relativePath: "private-assets/validation/merge-nami/merged.gltf",
    note: "Nami_0000, Nami_NewWorld_0500, Nami_NewWorld_1300 on one skeleton. Own sheets under preview/textures/nami. Not retargeted.",
  },
  {
    id: "noesis-usopp",
    label: "Noesis glTF Usopp roster",
    relativePath: "private-assets/validation/merge-usopp/merged.gltf",
    note: "Usopp_0000, Usopp_0500, Usopp_1300 on one skeleton. Own sheets under preview/textures/usopp. Not retargeted.",
  },
  {
    id: "glb-zoro",
    label: "Blender GLB Zoro (local)",
    relativePath: "private-assets/glb/zoro.glb",
    note: "Local Blender export of merge-roster. Switchable fallback validation only; Noesis remains battle default until parity is accepted.",
  },
  {
    id: "glb-sanji",
    label: "Blender GLB Sanji (local)",
    relativePath: "private-assets/glb/sanji.glb",
    note: "Local Blender export of merge-sanji. Not the battle default yet.",
  },
  {
    id: "glb-nami",
    label: "Blender GLB Nami (local)",
    relativePath: "private-assets/glb/nami.glb",
    note: "Local Blender export of merge-nami. Not the battle default yet.",
  },
  {
    id: "glb-usopp",
    label: "Blender GLB Usopp (local)",
    relativePath: "private-assets/glb/usopp.glb",
    note: "Local Blender export of merge-usopp. Not the battle default yet.",
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
