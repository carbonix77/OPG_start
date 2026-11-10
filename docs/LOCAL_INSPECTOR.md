# Local Zoro inspector

The page at `app/` loads Zoro from files that stay on this machine. It does not choose a canonical runtime model. Nothing under `preview/` or `private-assets/` is committed.

## Run

From `app/`:

```text
npm install
npm run dev
```

Open `http://localhost:5173/`. In the Cursor browser, `http://127.0.0.1:5173/` failed to connect and `localhost` worked. `npm run build` typechecks and writes `app/dist/`.

The dev server is allowed to read the repository root so Babylon can fetch:

- `preview/zoro.glb`
- `private-assets/validation/merge-1330/merged-b.gltf`
- `private-assets/validation/merge-1320/merged.gltf`
- `private-assets/validation/merge-idle/merged.gltf`
- `private-assets/validation/merge-quiet/merged.gltf`
- `private-assets/validation/merge-present/merged.gltf`
- `private-assets/validation/merge-next/merged.gltf`

Those glTF files also need their `.bin` next to them. If a selector fails, the missing path is shown in the status line.

## What the page does

- Switch between the existing GLB, the Noesis `1330` export, the Noesis Asura export, and two Noesis files of unnamed clips.
- Play, pause, loop, change speed, and scrub one clip at a time.
- Show the bind pose. That pose is not a verified idle clip.
- Orbit the camera. "Camera follows the root" moves only the camera. The clip still contains its root motion.
- Draw the skeleton, and toggle individual meshes. Toggles are not saved.
- "Sample mesh travel" lists offset from `SK_Skeleton` or `bone_1` at 0, 0.35, 0.65, and 1. The travel number is relative to that node, so root motion is not counted as mesh travel.
- "Temporary textures" assigns `preview/textures/zoro/map.json` onto materials named `Material_N`. That map is reconstructed. `weapon00` through `weapon04` are marked guessed. Body sheets also get their `_n` normal. Sword sheets have no matching normal. This is not the game shader. UV `invertY` is false. Normals set `invertNormalMapY` because Babylon reads DirectX-style normals and these PNGs are the OpenGL-style files the older viewer uses.
- "Mesh 36 sheet test" replaces the albedo on that mesh index. Other meshes keep the map. The UVs cover most of the sheet, so a different sheet is still a test.
- "Sword view" defaults to show all. It can hide meshes 3, 22, 23, and 24. The coincident-shell choice is an experimental diagnostic and stays off until it is selected.
- "Preview blade crop" puts a cropped sample of an existing sheet on the mouth mesh. The sheet test next to it is the comparison. Neither one is an original texture.
- "Preview stage" matches the ground to the background and pulls the ground edge out of frame. The shots are idle, anticipation, strike, and recovery. This is not a game effect.
- "Cinematic" plays the attack clip from the character config, moves the camera through that config's keys, then eases to the idle hold while the idle clip blends in. "Orbit camera" gives the inspector orbit back. "Preview effects" shows the config's slash, flash, and streak. Those are stand-ins, not an OPPW4 effect. The mouth crop stays off unless its own checkbox is on. The label on that checkbox says it is not an original texture.
- "Preview recenter" cancels the follow node's world X and Z on a preview parent. The clip keys stay as they are. Loop still restarts that motion when it is on.
- "Viewport only" hides the side panel and the status strip so a capture is the 3D view.
- "Provisional idle" loops `Zoro_0000` only when that clip is already in the loaded file. "1330, then idle" plays `Zoro_1330` once, crossfades for about 0.28 seconds, and returns to that loop. Both use the file's own skeleton. The buttons also turn on the temporary textures and a 16:9 frame. On a Noesis mesh, the sheet comes from the GLB material slot of the same mesh index. Vertex counts matched. That is still the reconstructed map. The preview hides the tiny world-static meshes and fits meshes whose boxes come near the follow node, including long blades. The fit factor is 1.35. Show all is still available. The clips are not retargeted. Clip names, sword stacks, and the stage lights live in `app/src/inspector/previewConfig.ts`.

`Zoro_1320`, `Zoro_1322`, and `Zoro_1324` stay separate clips. The page does not play them on three bodies.

## Another character

`InspectorScene` does not contain a character name, a clip name, or a mesh index. `previewForAsset` returns a `PreviewConfig`. A second character adds its own object: texture directory, clip names, material slots, sword groups, camera keys, and effect markers. `previewForAsset` then returns that object for the new asset id. The cinematic player reads `cinematic.keys` and `cinematic.effects`. A config with `cinematic: null` has nothing for that button to play. No scene method needs a new branch for that character.

The page also puts the scene on `window.__inspector` so a local check can call `scrub` and `sampleMeshTravel`. That handle is not a game API.

## Merge checkbox

Project G1M's "Merge all assets in the same folder" item is a saved toggle. `Noesis64.exe ?runtool "Merge all assets in the same folder"` flips it. It does not set it to on. Do not call it once per export. After the test recorded in `reports/ZORO_G1A_EXPORT.md`, the checkbox was left off. The unnamed-candidate export in `reports/ZORO_SHEET_IDLE.md` also left it off: `merged.gltf` names the five clips and `control.gltf` names none.
