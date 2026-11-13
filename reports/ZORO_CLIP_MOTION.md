# Unnamed-clip motion, recenter, and sword overlap

This follows issue #9. `Zoro_0000` stays labeled an unnamed in-place combat stance and idle candidate. It is not a verified idle. `Zoro_0060` and `Zoro_0061` stay possible reactions. They are not verified hits. No Asura phantom was spawned. No canonical model was chosen. `map.json` was not edited. Show all meshes stays the default.

The owner confirmed that development screenshots may stay in this public repository during the Zoro prototype. That permission covers these images. It does not cover original extracts.

## What was run

```text
cd app
npm run dev
npm run build
```

Page: `http://localhost:5173/`. Samples are normalized time 0, 0.25, 0.5, 0.75, and 1. "Viewport only" hid the side panel for the frames below. `setView('front')` framed the body after each sample.

The first quiet-clip export is `private-assets/validation/merge-idle/merged.gltf`. The second, limited to three more unnamed files, is `private-assets/validation/merge-quiet/merged.gltf`. Each control export named none of the clips, so the merge checkbox was left off after both.

## Inventory

Reconstructed bins under `preview/zoro-anims`: 207 files, 115 named, 92 unnamed, 0 unreadable. `Zoro/spells` has 211 `.g1a` files. The four without a bin are `Zoro_1300_camera`, `Zoro_1310_camera`, `Zoro_1320_camera`, and `Zoro_1330_camera`. Those were not treated as body clips.

Bone-1 translation spans below come from the reconstructed bins. They are not original G1A durations. Unnamed clips with Z span under 8 and duration at least 0.4 seconds:

| Clip | Seconds | Tracks | Bone-1 span X/Y/Z | G1A bytes |
| --- | --- | --- | --- | --- |
| `Zoro_0006` | 0.433 | 124 | 0 / 10.14 / 0 | 26680 |
| `Zoro_0003` | 0.567 | 124 | 4.47 / 9.07 / 0 | 26372 |
| `Zoro_0050` | 1.183 | 124 | 0 / 33.76 / 0 | 27164 |
| `Zoro_0051` | 1.183 | 124 | 0 / 0 / 0 | 13260 |
| `Zoro_0071` | 1.533 | 124 | 1.78 / 29.87 / 0 | 32072 |
| `Zoro_0604` | 1.183 | 124 | 11.33 / 5.45 / 0.89 | 44580 |
| `Zoro_0165` | 0.700 | 124 | 0.54 / 0.59 / 1.49 | 9732 |
| `Zoro_0000` | 1.367 | 290 | 1.58 / 2.56 / 1.87 | 20204 |
| `Zoro_0001` | 1.367 | 147 | 1.58 / 2.56 / 1.87 | 10512 |
| `Zoro_1650` | 1.500 | 124 | 6.18 / 7.37 / 2.94 | 21656 |

Played batches: `0000`, `0001`, `0051`, `0060`, `0061`, then `0165`, `0006`, `0003`. The rest were not exported.

## Motion that was played

Bone drift is the summed movement of 24 joints from the pose at time 0. One group was started at a time.

| Clip | Root | Time 0 | Mid | Time 1 | Loop |
| --- | --- | --- | --- | --- | --- |
| `Zoro_0000` | about 1.6 / 2.5 / 1.3 | Crouched combat stance, swords in the hands | Same stance, weight shifted. Drift 95.5 | Returns. Drift 2.5 | Near loop |
| `Zoro_0001` | same samples as `0000` | Same sampled joint positions as `0000` | Same | Same | Near loop. Fewer bin tracks. Still a separate clip |
| `Zoro_0051` | stays at Y 119.91 | Already airborne, arms wide, one knee up | Same aerial pose, small limb shifts. Drift 15.3 | Returns. Drift 3.8 | Near loop of an aerial pose |
| `Zoro_0060` | no translation | Low lunge, swords in the hands | Inverted, body flung back. Drift 1505.8 | Different tumble, one knee up. Drift 657.6 | Does not return |
| `Zoro_0061` | no translation | Seated fall, swords in the hands | Inverted, legs up. Drift 723.9 | Low, arms wide. Drift 974.5 | Does not return |
| `Zoro_0165` | about 0.5 / 0.6 / 1.5 | Deep crouch, one sword planted | Same crouch. Drift 22.8 | Returns. Drift 1.9 | Near loop of a crouch |
| `Zoro_0006` | Y bobs about 8 | Low pose | Wide low sword pose. Drift 142.9 | Drift 14.6 | Does not fully return |
| `Zoro_0003` | X about 4 | — | Forward lunge, swords down. Drift 1036.8 | Drift 58.4 | Does not return |

`0000` and `0001` are the idle candidate. The motion is a weight shift inside one combat stance, and the swords stay in the hands. `0165` is a crouch, not a standing idle. `0060` and `0061` are separate short motions that end away from their first frame. They look like knockdowns. That is not a confirmed hit name.

Frames, viewport only: `zoro-0000-t000.png` through `zoro-0000-t100.png`, the same set for `0051`, `0060`, and `0061`, plus `zoro-0165-t000.png`, `zoro-0165-t050.png`, `zoro-0165-t100.png`, `zoro-0006-t050.png`, and `zoro-0003-t050.png`.

## Recenter on `SK_Skeleton`

Cancelling the follow node's local X failed on the Noesis skeleton. At `Zoro_0000` time 0.5, local X was +1.56 and world X was -1.56. Subtracting local X doubled the world X. Z did cancel.

The preview parent now cancels world X and Z, leaving the clip keys alone. On Noesis `Zoro_1330` at time 1, `SK_Skeleton` local Z stayed 532.9 and world X/Z became 0. At time 0 with recenter still on, world X/Z stayed 0 while local Z was -3.7. Turning recenter off restored world Z to the clip. Looping still jumps that local value from about 533 to about -4. The raw motion is intact.

Switching models left only the new file's groups: the GLB's `1300`, `1310`, `1320`, `1330`, then only `Zoro_1330`, then only `Zoro_0003`, `Zoro_0006`, and `Zoro_0165`.

## Swords during motion

On the GLB clip `1330`, `Mesh_17` and `Mesh_27` stayed about 0.1 units apart at every sample. `Mesh_30`, `Mesh_33`, and `Mesh_39` stayed together as well. On Noesis `Zoro_0000`, submeshes 17 and 27 stayed within 0.16, and 30, 33, and 39 stayed together. They move as overlapping swords. No sample separated a stack into a hilt and a blade, so show all remains the default.

`Material_33` is still the cloth baseline on `Mesh_36`.

## Framing

`zoro-1330-t065-framed.png` is GLB `1330` at time 0.65 with temporary textures, viewport only, and the front frame. The body fills the view. Root Z was about 551. A tiny world-static speck can remain outside that frame. The bind pose is still a T-pose and is not used as idle.

## Not done

- No verified idle and no verified hit, so Asura `1322` and `1324` stay off separate bodies.
- `Zoro_0050`, `Zoro_0071`, `Zoro_0604`, and `Zoro_1650` were inventoried and not exported.
- Noesis files are still untextured.
