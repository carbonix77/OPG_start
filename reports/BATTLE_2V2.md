# Battle reliability and 2v2 arena

Issue #22 accepted `6fccbb5` and required P0 lifecycle fixes, then a real-character 2v2 path.

## P0

- Battle actions carry monotonic `actionId` values.
- Presentation callbacks carry a Babylon `token`. Stale tokens cannot apply contact, finish, flash, or clear `busy`.
- `finishAction` no longer invents contact. Interrupted or missing-clip paths must `abortAction`.
- `resolveFully` remains the explicit headless commit path.
- Reset is disabled while busy. Mode unmount cancels presentation.
- Validation rejects duplicate ids, missing teams, non-positive HP/speed, and unordered skill markers.
- Tests: 12 passing, including abort-before-contact, stale callbacks, missing-contact finish block, dead-unit skip, and seeded 5v5 replay.

## Sanji import

- Local files: `Sanji/model/MPLC004_Sanji.g1m` plus spells `1290/1300/1310/1330`.
- Exported to `private-assets/validation/merge-sanji/merged.gltf` with those four clips. Control export had zero Sanji clip names. Merge checkbox left off.
- No local Sanji idle or basic G1A was present. `Sanji_1290` / `Sanji_1300` are labeled provisional stand-ins only.
- Inspector model: **Noesis glTF Sanji specials**.
- Lucci and Crocodile were not present in the project tree. They remain candidates only.

## P1/P2 battle preview

- Mode → Battle preview now builds a generated four-slot arena with pads, horizon slab, HP list, target select, and turn auto-resolve for non-Zoro actors.
- Formation: Zoro (real roster anim) + labeled interim ally + two labeled interim enemies.
- Zoro Basic Attack still uses `Zoro_0500` with exactly-once contact.
- Defeat hides the matching unit view.

## Browser check

`reports/screenshots/battle-2v2-after-a.png` shows the arena with Zoro and three labeled interim figures after Basic Attack on ENEMY-A. A follow-up target switch damaged ENEMY-B as well (HP moved on both enemies while Zoro remained the player actor).

## Remaining blockers to four real characters

1. Sanji idle/basic G1As not in the local copy.
2. Lucci/Crocodile assets not located in-repo.
3. Dual skinned characters in one battle scene still need a shared unit-root loader beyond the current Zoro-centered `previewRoot`.
