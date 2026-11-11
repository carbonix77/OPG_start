# REVIEW #28 — Playable 2v2 mechanics + four local GLBs

**Commit:** (set at push) · Branch `research/phase-1-extraction`  
**Supersedes priority order from #26 owner override (2026-11-11).**

## Blender
- Path: `D:\blender\blender.exe`
- Version: **Blender 5.2.2 LTS** (verified; no reinstall)
- Command: `python tools/export_all_characters.py`

## P0 — Mechanics
- Player **Basic** (+1 EN) and **Special** (−3 EN) from `primarySkills` / manifests
- Deterministic energy meter (start 1, cap 5) on every unit
- Turn queue, HP bars, EN readout, victory/defeat banner, reset
- Bravo AI (`chooseEnemyAction`): seeded Basic vs Special, lowest-HP alpha target
- Exactly-once contact unchanged; abort before contact refunds energy
- Headless tests: **20** vitest (energy gate/refund, AI replay, full 2v2 to winner, 5v5)

## P1 — GLB matrix (local / gitignored binaries)

See `reports/GLB_EXPORT_MATRIX.md`. Summary:

| Char | File | Size | Clips | Bones | OK |
|------|------|-----:|------:|------:|:--:|
| Zoro | `private-assets/glb/zoro.glb` | 5.27 MB | 9 (incl. 1322/1324 phantoms) | 141 | yes |
| Sanji | `private-assets/glb/sanji.glb` | 5.80 MB | 6 | (see matrix) | yes |
| Nami | `private-assets/glb/nami.glb` | 2.29 MB | 3 | 158 | yes |
| Usopp | `private-assets/glb/usopp.glb` | 5.47 MB | 3 | 319 | yes |

- Full mesh lists retained (hide preset is presentation-only).
- Battle **Asset source** select: Noesis default · Blender GLB validation switch.
- No GLB binaries committed.

## P2 — Known visual limits (not blocking this gate)
- `Sanji_0000` remains a candidate open-arm idle (not searched this commit).
- Hide preset + Show All unchanged.
- Texture embed into GLB is best-effort; Babylon temporary look still drives Noesis/GLB battle texturing.

## Verify
1. `npm test` / `npm run build`
2. Battle → Basic/Special enabled states, energy, AI turns, KO/winner
3. Optional: switch Asset source to GLB and confirm load
