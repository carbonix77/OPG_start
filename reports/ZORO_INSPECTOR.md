# Zoro inspector playback

The page in `app/` plays the existing GLB and the two local Noesis glTF files. Neither file is the canonical runtime model. Screenshots are local only, under `reports/screenshots/`, and that directory is gitignored.

## How it was run

```text
cd app
npm install
npm run build
npm run dev
```

`npm run build` completed. Vite warned that the main chunk is about 6.5 MB. The dev server was opened at `http://localhost:5173/`. `http://127.0.0.1:5173/` did not connect in the Cursor browser.

Playback was checked in that page: play, pause, speed, scrub, bind pose, camera follow, skeleton debug, and mesh-travel sampling. No mesh was hidden.

## Existing GLB

Loaded `preview/zoro.glb`.

- 40 meshes, 37 materials, 36 skeletons, 49 joints on the first skeleton, follow node `bone_1`.
- Clips: `1300` 2.000s, `1310` 6.100s, `1320` 6.850s, `1330` 6.683s.
- No embedded images. The mesh renders untextured.
- Play on `1330` advanced the frame. Pause held it. Speed 2 advanced faster than speed 1.
- Camera follow moves the camera target onto `bone_1`. The clip still carries the root motion. At 65% of `1330`, `bone_1` was about 551 units along Z and the character stayed in frame.

Bind pose is a rest pose, not a verified idle. The front view shows blades in both hands, one blade reading across the mouth, and blades at the hip. That does not identify which mesh is the mouth sword.

Mesh travel on `1330`, relative to `bone_1`:

- `Mesh_17` and `Mesh_27` move together (about 124 units relative, about 524 world).
- `Mesh_30`, `Mesh_33`, and `Mesh_39` move together (about 122 relative, about 551 world).
- `Mesh_28`, `Mesh_31`, `Mesh_37`, and `Mesh_34` stay near the hip (about 24 relative) and still travel with the body in world space.
- `Mesh_3`, `Mesh_22`, `Mesh_23`, and `Mesh_24` have world travel 0. They stay where they were while the body moves. Their large relative number is the root leaving them behind. They stay visible.

The same pairs show up on `1320`. Nothing was turned off.

Skeleton debug draws only `skeletons[0]`. On this file that is a short chain on the torso and head, not a joint in the swords.

## Noesis glTF 1330

Loaded `private-assets/validation/merge-1330/merged-b.gltf`.

- 40 meshes, 1 material, 1 skeleton, 141 joints, follow node `SK_Skeleton`.
- One clip: `Zoro_1330`, 6.633s.
- `SK_Skeleton` moved about 537 units on Z from the first frame to the last.
- Submeshes 17 and 27 move together, and 30, 33, and 39 move together, matching the GLB pairs. The 65% frame is the same airborne pose as GLB `1330`, including a blade that reads as the mouth sword.
- The first model switch also left GLB clips `1310` and `1330` attached to a disposed `bone_1`. The loader now drops animation groups that are not part of the current file, and a stale load disposes its own import. After that fix the scene contained only `Zoro_1330`.

## Noesis glTF Asura

Loaded `private-assets/validation/merge-1320/merged.gltf`.

- 40 meshes, 1 skeleton, 141 joints, follow node `SK_Skeleton`.
- Three clips, not one group and not three bodies: `Zoro_1320` (228 channels), `Zoro_1322` (114), `Zoro_1324` (113). Each lasts 6.817s.
- Scrubbing one clip stops the others.
- From the first frame to the last, `SK_Skeleton` moved 836.66 units on Z in each of the three clips. An earlier channel-span measurement was about 858; that is the key extent, not the first-to-last distance.
- The 65% frame of `Zoro_1320` shows the same kind of pose as the GLB `1320` frame: blades in the hands, one across the mouth, blades at the hip.

## Not decided

- No canonical file.
- No mesh was identified as the mouth sword, so default visibility stays on.
- Idle and hit clips are still unidentified.
- No textures are applied. The Noesis files have no texture images.
