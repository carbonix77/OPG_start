# Sanji idle disparity (`Sanji_0000`)

## Observation
Battle landscape idle often reads as near T-pose / arms nearly horizontal. Inspector special closeups (`Sanji_1290` / mid-attack) look more "guard-like". Do not treat one frame as proof the idle is broken or fixed.

## Offline clip evidence (`merge-sanji/merged.gltf`)
| Clip | Channels | Notes |
|------|----------|-------|
| `Sanji_0000` | 144 | Idle candidate used by battle + manifest |
| `Sanji_0500` | 160 | Basic attack |
| `Sanji_1290`+ | 260–311 | Specials; larger motion |

`Sanji_0000` is a real animation group on the merge (not missing). The battle path calls `playIdle("Sanji_0000")` after load and on reset.

## Runtime checks added
Battle panel buttons: **Sanji idle t0 / t.25 / t.5 / t.75 / Loop idle** hold the same clip at normalized phases without editing keys. Capture those frames for the next review.

## Working theory
The candidate idle itself is an upright / open-arm combat stance on this export, so landscape reads more T-pose-like than Zoro's crouched `Zoro_0000`. The raised-knee closeup was a different clip/phase, not proof battle fails to start `0000`.

## Runtime phase captures (2026-11-10)
Battle panel held `Sanji_0000` at normalized phases:
- t=0.00 (frame 0) → arms near horizontal / T-pose read (`review27-sanji-idle-t0.png`)
- t=0.25 (frame 23.5), t=0.50 (frame 47), t=0.75 (frame 70.5) → same open-arm read (`review27-sanji-idle-t75.png`)

Status text confirmed the unit was scrubbing `Sanji_0000`, not bind-pose fallback. Clip span ≈ 94 frames.

## Not done here
No alternate idle was swapped in. No Blender rest-pose edits. If owner finds a better G1A idle later, change `SANJI_MANIFEST.idleClip` + `SANJI_PREVIEW.idleClip` together.
