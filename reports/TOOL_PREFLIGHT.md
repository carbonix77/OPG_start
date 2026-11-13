# Blender and 3DMigoto preflight

Nothing was installed. The game directory was not modified. No loader was downloaded.

## Blender

`where.exe blender` found no executable, and `C:\Program Files\Blender Foundation` is not present. A round trip was not run.

If an install is approved later, the test is a copy of `private-assets/validation/merge-roster/merged.gltf` and its `.bin`, imported in Blender and not written back over the source. The check is whether the import still has 141 joints and the nine `Zoro_` animation groups. A round trip that renames `SK_Skeleton` or drops a clip is more manual than the current Babylon mesh and bone read, so it would be rejected. Blender is not recommended for this milestone.

## 3DMigoto

The existing note is `reports/OPPW4_MOD_LOADER_RESEARCH.md`. Nexus mod 2 v0.5 is HazzyDevil's 3DMigoto loader. It says it can replace textures and meshes and dump one frame's textures and vertex buffers. It does not claim G1A, skeletons, or G1FX. It was last updated on Nexus on 4 May 2021. It does not state Legendary Edition support. Installing it means extracting files beside the game. That is injection. It was not tested here, and no anti-cheat behavior was established.

Decision: no-go. Do not download, install, or inject it without a separate owner approval.

If that approval is given, the single useful capture is one in-game frame of Zoro with the mouth sword visible, using the loader's frame analysis, so the texture bound to that draw can be compared with `cloth.png` and `weapon.png`. A dumped vertex buffer is a posed snapshot. It is not a clip.

## Reference frames to request

These are comparisons, not assets to extract. None of them is assumed to exist on this machine.

1. Battle idle, showing where the three swords rest.
2. The first hit of the normal attack string.
3. Combo-order Oni Giri at the airborne moment.
4. Charming Demon Sleepless Night Onigiri while the mouth blade is at the face.
5. Asura with both extra bodies, showing where they stand.
6. One hit reaction.

Footage would be evidence for the labels. It would not be a license to republish the frames.
