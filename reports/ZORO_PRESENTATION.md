# Provisional idle, then 1330

This follows issue #10. `Zoro_0000` is a provisional preview idle. It is not a verified game idle. `Zoro_1330` is the attack in the same file. No clip was retargeted onto another skeleton. No canonical model was chosen. Asura phantoms were not spawned. `map.json` was not edited.

## Asset path

`private-assets/validation/merge-present/merged.gltf` contains `Zoro_0000` and `Zoro_1330` on `SK_Skeleton`. The control export named neither clip, so the merge checkbox was left off.

The GLB still uses `bone_N` and does not contain `Zoro_0000`. The sequence stays on the Noesis file. That file has one material and no textures. The textured GLB remains available for comparison, not for this sequence.

## What was run

```text
cd app
npm run dev
npm run build
```

Page: `http://localhost:5173/`, model "Noesis glTF provisional idle and 1330".

"Provisional idle" loops `Zoro_0000`, hides the tiny world-static meshes, and frames the body. "1330, then idle" plays `Zoro_1330` once and then loops `Zoro_0000` again. At speed 4, `SK_Skeleton` local Z during `Zoro_1330` moved through about 28, 110, 546, and 555, and the next started group was `Zoro_0000` at local Z 0. The clip keys were not edited. Camera follow only moves the camera.

Show all is still in the sword view. The preview hide removes submeshes ending in `_0003`, `_0022`, `_0023`, and `_0024`, the same indices as GLB meshes 3, 22, 23, and 24. Hand stacks were not removed.

## Mouth sword

Submesh 36, relative to `SK_Skeleton`:

| Clip | Time 0 | 0.25 | 0.5 | 0.75 | 1 |
| --- | --- | --- | --- | --- | --- |
| `Zoro_0000` | 8, -24, -26 | 8, -23, -27 | 9, -23, -26 | 9, -25, -25 | 8, -24, -26 |
| `Zoro_1330` | 59, 78, 34 | -52, 24, 35 | -51, 29, 44 | -44, 27, 39 | -1, -21, -40 |

During the provisional idle the offset stays put, so that blade moves with the root. During `Zoro_1330` the offset changes by more than 100 units. The 0.35 frame still shows a blade across the face. Attachment for the whole attack is not verified.

## Framing

The preview fits meshes shorter than 130 units and ignores the long blades and the hidden static meshes. The ground is dark. `zoro-present-idle.png`, `zoro-present-1330-t035.png`, and `zoro-present-1330-t065.png` are viewport-only. The body fills the frame. No world-static speck is in those shots. Sword overlaps remain.

## Next unnamed clips

`private-assets/validation/merge-next/merged.gltf` contains `Zoro_0050`, `Zoro_0071`, `Zoro_0604`, and `Zoro_1650`. The control export named none. One group was started at a time. None returns to its first pose.

| Clip | Time 0.5 | Drift at 0.5 | Drift at 1 |
| --- | --- | --- | --- |
| `Zoro_0050` | Aerial, arms wide, knees up | 1793 | 2197 |
| `Zoro_0071` | Aerial lean, swords out | 1762 | 2360 |
| `Zoro_0604` | One sword raised overhead | 934 | 599 |
| `Zoro_1650` | Standing, one sword high and one to the side | 1064 | 1864 |

None is an idle or a verified hit. Frames: `zoro-0050-t050.png`, `zoro-0071-t050.png`, `zoro-0604-t050.png`, `zoro-1650-t050.png`.

## Not done

- The presentation file is untextured.
- Idle and hit names are still provisional.
- Sword stacks are still overlapping.
- Asura `1322` and `1324` stay off separate bodies.
