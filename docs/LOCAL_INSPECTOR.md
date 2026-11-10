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

Those glTF files also need their `.bin` next to them. If a selector fails, the missing path is shown in the status line.

## What the page does

- Switch between the existing GLB and the two Noesis glTF exports.
- Play, pause, loop, change speed, and scrub one clip at a time.
- Show the bind pose. That pose is not a verified idle clip.
- Orbit the camera. "Camera follows the root" moves only the camera. The clip still contains its root motion.
- Draw the skeleton, and toggle individual meshes. Toggles are not saved.
- "Sample mesh travel" lists offset from `SK_Skeleton` or `bone_1` at 0, 0.35, 0.65, and 1. The travel number is relative to that node, so root motion is not counted as mesh travel.
- "Temporary textures" assigns `preview/textures/zoro/map.json` onto materials named `Material_N`. That map is reconstructed. `weapon00` through `weapon04` are marked guessed. Body sheets also get their `_n` normal. Sword sheets have no matching normal. This is not the game shader. UV `invertY` is false. Normals set `invertNormalMapY` because Babylon reads DirectX-style normals and these PNGs are the OpenGL-style files the older viewer uses.

`Zoro_1320`, `Zoro_1322`, and `Zoro_1324` stay separate clips. The page does not play them on three bodies.

The page also puts the scene on `window.__inspector` so a local check can call `scrub` and `sampleMeshTravel`. That handle is not a game API.

## Merge checkbox

Project G1M's "Merge all assets in the same folder" item is a saved toggle. `Noesis64.exe ?runtool "Merge all assets in the same folder"` flips it. It does not set it to on. Do not call it once per export. After the test recorded in `reports/ZORO_G1A_EXPORT.md`, the checkbox was left off.
