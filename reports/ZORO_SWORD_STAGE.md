# Sword shells, mouth blade, and a preview stage

This follows issue #12. The textured Noesis sequence stays the presentation path. The GLB stays a separate comparison. Neither is the canonical model. No mesh was deleted. No clip key was edited. `map.json` was not edited. Sword stacks are hidden only by a reversible preset, and show all is still available.

Clip names, the material-slot table, the stack indices, and the stage lights are in `app/src/inspector/previewConfig.ts`. The scene reads that config.

## Sword shells

Meshes 17 and 27 are both skinned to `SK_L_Weapon`. Meshes 30, 33, and 39 are both skinned to `SK_R_Weapon`. In the bind pose their surfaces sit within about 2 units, and they are not the same vertex list. 17 has 1032 vertices, 27 has 516, 30 has 516, 33 has 994, and 39 has 1268.

Center distance on the posed Noesis file, with preview recenter on:

| Sample | 17 to 27 | 30 to 33 | 30 to 39 | 33 to 39 |
| --- | --- | --- | --- | --- |
| `Zoro_0000` at 0 | 0.15 | 0.13 | 0.42 | 0.41 |
| `Zoro_1330` at 0.35 | 0.28 | 0.12 | 0.32 | 0.44 |
| `Zoro_1330` at 0.65 | 0.04 | 0.27 | 0.28 | 0.06 |
| `Zoro_1330` at 1 | 0.15 | 0.16 | 0.16 | 0.00 |
| Return, `Zoro_0000` at 0 | 0.15 | 0.13 | 0.42 | 0.41 |

They do not separate in this attack. The diagnostic preset hides the lower-vertex members while every center stays within 1 of the highest-vertex mesh. That distance is above the measured gaps. It is not a game rule. If a later clip moves a member past 1, that stack is shown again. The preset also hides the tiny world-static meshes 3, 22, 23, and 24. At idle, at 0.35, and at 0.65 it hid 27, 30, and 33, and it kept 17 and 39.

The pictures still show a grip cluster and three swords. Hiding the coincident shells does not remove a sword, because the kept meshes already fill the same volume, and mesh 36 stays visible. Show all is the first sword-view choice.

| Frame | Before, shells visible | After, coincident shells hidden |
| --- | --- | --- |
| Idle, `Zoro_0000` at 0 | `zoro-stack-before-idle.png` | `zoro-stack-after-idle.png` |
| `Zoro_1330` at 0.35 | `zoro-stack-before-1330-t035.png` | `zoro-stack-after-1330-t035.png` |
| `Zoro_1330` at 0.65 | `zoro-stack-before-1330-t065.png` | `zoro-stack-after-1330-t065.png` |
| Return, `Zoro_0000` at 0 | `zoro-stack-before-return.png` | `zoro-stack-after-return.png` |

## Mouth blade

Mesh 36 has 803 vertices. Every vertex is weighted 1 to bone `0x43b3b303`. That bone's parent is `SK_Head`. `F_Chin` is a sibling, not the parent. There is no bone named jaw. Both `Zoro_0000` and `Zoro_1330` already have translation and rotation keys on that bone. `SK_Head` translation stays near `(9.27, 0, 0)` through `Zoro_1330`. The blade bone's own translation moves from about `(24.1, -0.4, -32.0)` at the start, to about `(10.1, 1.1, 0)` at 0.35 and 0.65, to about `(-7.4, 51.9, -16.5)` at the end.

The blade bone stays inside the mesh 36 box at every sample above. The head and chin are inside that box at 0.35 and 0.65, and about 28 to 42 units outside it at the idle and at the attack's last frame. The mesh is a rigged blade on a head child. A preview attachment would fight those keys, so none was added.

The UVs cover 45 of 64 cells on the sheet. The 5th to 95th percentile runs from about 0.04 to 0.95 in U and 0.06 to 0.87 in V. `cloth` therefore paints the shirt, sash, and trousers onto the blade. That is why the mouth sword looks patchy. A one-mesh test of `weapon.png` is `zoro-mouth-weapon-t035.png`, next to the cloth frame `zoro-stack-before-1330-t035.png`. The weapon sheet looks darker because that atlas is mostly dark. The UVs still cover the whole sheet, so this is not an authenticated blade map. `cloth` stays the diagnostic baseline.

## Handoff

`Zoro_1330` lasts 6.633 seconds. `Zoro_0000` lasts 1.333 seconds. These stills use preview recenter and camera follow, except the last pair.

| Frame | File |
| --- | --- |
| 0.30 s before the attack end | `zoro-handoff-1330-m030.png` |
| 0.10 s before the attack end | `zoro-handoff-1330-m010.png` |
| Attack end | `zoro-handoff-1330-end.png` |
| Idle start | `zoro-handoff-0000-p000.png` |
| 0.30 s into the idle | `zoro-handoff-0000-p030.png` |

With recenter, the attack end and the idle start are the same stance in the frame. Head position relative to `SK_Skeleton` is about `(5.58, 46.40, 20.26)` at the attack end and `(5.43, 46.36, 20.38)` at the idle start. The body does not snap. Root local Z is about 532.93, then -0.04. World Z stays 0 while recenter is on. The stored root reset is still in the clip.

The same fixed camera, recenter off, follow off, radius 900, target at the origin:

| Frame | File | Root world |
| --- | --- | --- |
| Attack end | `zoro-handoff-norecenter-end.png` | about `(-0.9, 95.6, 532.9)` |
| Idle start | `zoro-handoff-norecenter-start.png` | about `(0, 95.7, 0)` |

The character leaves the origin at the attack end and returns when the idle starts. Camera follow hides that jump. It does not remove it. The 0.28 second weight crossfade is unchanged and does not edit keys.

## Stage

"Preview stage" darkens the background, raises the key, and adds a rim light. It is not an OPPW4 effect. Two shots are in the config.

| Shot | File | Radius |
| --- | --- | --- |
| Idle, front | `zoro-stage-idle.png` | 520 |
| Attack at 0.35, three-quarter | `zoro-stage-attack.png` | 640 |

The attack shot keeps the raised blades in frame. The idle shot still lets the downward tip meet the lower edge. The fit now includes a mesh when its box comes near the follow node, and the fit factor is 1.35, so a long blade is not dropped just because its center is far. Extreme tips can still meet the frame.

## Checks

`npm run build` in `app/` is the typecheck for this pass. The page was `http://localhost:5173/`, model "Noesis glTF provisional idle and 1330". Frames are 16:9 viewport captures. A dark strip at the top of some captures is the browser chrome.

## Still open

- The texture map is still reconstructed. Mesh 36 stays on `cloth`.
- Coincident shells can be hidden, and the hip cluster is still there.
- `Zoro_0000` is still a provisional idle.
- The root key still resets. Recenter only hides that in world space.
- No canonical model. No Asura phantoms. No game VFX.
