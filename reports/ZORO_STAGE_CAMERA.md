# Closer stage, mouth-blade crop, and sword groups

This follows issue #13. Show all stays the default. The coincident-shell choice stays an experimental diagnostic and is off until it is selected. No mesh was deleted. No clip key was edited. The 0.28 second crossfade is not treated as a fix for the root reset.

## Stage

The old stage shots are `zoro-stage-idle.png` at radius 520 and `zoro-stage-attack.png` at radius 640. The character was small, and the finite ground drew a hard edge against the background.

The stage ground color now matches the background, and the ground is scaled so that edge leaves the frame. Shots aim at the follow node plus a small height offset, instead of the full sword bounds, so Zoro fills more of the 16:9 frame. Raised tips can still meet the top edge.

| Shot | Time | Radius | File |
| --- | --- | --- | --- |
| Idle | `Zoro_0000` at 0 | 470 | `zoro-stage2-idle.png` |
| Anticipation | `Zoro_1330` at 0.12 | 520 | `zoro-stage2-anticipation.png` |
| Strike | `Zoro_1330` at 0.35 | 540 | `zoro-stage2-strike.png` |
| Recovery | `Zoro_1330` at 0.92 | 500 | `zoro-stage2-recovery.png` |

These are preview lights. They are not an OPPW4 effect.

## Mouth blade

Mesh 36 stays on the reconstructed `cloth` map unless the preview crop is turned on. The crop samples a narrow part of `weapon.png` through texture scale and offset. It does not change the mesh UVs and it is not an original atlas. The sheet dropdown still replaces that one mesh for comparison.

`zoro-stage2-strike.png` is the cloth baseline. The shirt and sash pattern is on the blade. `zoro-mouth-crop-strike.png` is the same pose with the crop. The clothing pattern is gone. The blade is a dark uneven metal sample, still not an authenticated texture. The crop is off by default.

## Three-sword proposal

Measured groups, from skin weights and bone parents. Show all remains the fallback. Nothing in this list is hidden by the stage or by the sequence buttons.

| Group | Bone | Parent | Meshes | What the clips show |
| --- | --- | --- | --- | --- |
| Left hand | `SK_L_Weapon` | left hand | 17, 27 | One weapon bone. Centers stay within 0.28. Both stay visible. |
| Right hand | `SK_R_Weapon` | right hand | 30, 33, 39 | One weapon bone. Centers stay within 0.44. All three stay visible. |
| Mouth | `0x43b3b303` | `SK_Head` | 36 | Own keys. Near the face from about 0.08 through 0.65, then leaves. Not a jaw. |
| Hip candidates | `0x7ede6180`, `0x8a94f061`, `0x964b7f42` | a child of `SK_Hips` | 15, 16, 25, 26, 28, 29, 31, 32, 34, 35, 37, 38 | Local translation stays within about 0.02 through `Zoro_1330`. They do not travel with the hands. |

Proposal for idle, anticipation, strike, and recovery: show every group. The hip meshes are scabbard candidates because they stay on the hips, and that is not enough to hide them. The experimental shell preset can still hide 27, 30, and 33 while their centers stay within 1, and it is not the presentation default.

## Handoff

Consecutive frames with preview recenter and camera follow. Radius stayed 450. Root world X and Z stayed 0. Root local Z did not.

| Frame | File | Root local Z | Camera target |
| --- | --- | --- | --- |
| 0.06 s before the attack end | `zoro-handoff2-m060.png` | 532.38 | about (27.9, 79.8, 12.4) |
| Attack end | `zoro-handoff2-end.png` | 532.93 | about (29.6, 80.3, 10.5) |
| Idle start | `zoro-handoff2-p000.png` | -0.04 | about (31.1, 80.3, 17.6) |

Samples 0.03 seconds on either side of the cut, without extra pictures, keep the same pattern: world Z is 0, local Z jumps from about 533 to 0, and the camera target moves only a few units because the fitted bounds change. The stance matches. The crossfade does not remove the stored root reset. The earlier fixed-camera pair, `zoro-handoff-norecenter-end.png` and `zoro-handoff-norecenter-start.png`, still shows the character leave the origin when recenter is off.

## Checks

`npm run build` in `app/` is the typecheck for this pass. The page was `http://localhost:5173/`, model "Noesis glTF provisional idle and 1330".

## Still open

- Mesh 36's real texture is still unknown. The crop is a preview stand-in.
- Hip meshes are not confirmed scabbards.
- `Zoro_0000` is still a provisional idle.
- The root key still resets.
- No canonical model. No Asura phantoms. No game VFX.
