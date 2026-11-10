# REVIEW #26 — retest pack (mesh hides)

For ChatGPT / reviewer visual analysis after owner hide lists (`acb7dff`).

## Automated tests
```
npm test  → 17/17 passed
npm run build → OK
```
Date: 2026-11-10.

## Live load counts (hides applied)
| Unit | Drawn meshes | Textures | Clips |
|------|--------------|----------|-------|
| Zoro | 39 | 36 | roster set |
| Sanji | 25 (was 32) | 24 | 0000/0500 + specials |
| Nami | 11 (was 24) | 11 | 0000/0500/1300 |
| Usopp | 20 (was 37) | 20 | 0000/0500/1300 |
Heap ~252 MB, 4/4 textured.

## Screenshots (under `reports/screenshots/`)
1. `review26-battle-idle-hides.png` — landscape 2v2 idle, all four, hides on
2. `review26-after-zoro-basic.png` — after Zoro basic → Nami (Nami 62/80), Sanji's turn
3. `review26-after-round1.png` — after Sanji + auto enemy turns (Zoro 77, Nami 46)
4. `review26-sanji-closeup-hides.png` — Sanji inspector, 25 meshes, textured suit, kick/guard pose
5. `review26-nami-inspector-meshcount.png` — confirms Nami loaded with 11 meshes (camera over-zoomed)

## Visual notes for analysis
- Mid-arena scrambled cloth blobs from earlier shots are gone after hides.
- Zoro/Nami/Usopp idle poses look combat-ready; Sanji often reads as near T-pose on `Sanji_0000` in battle (clip may be sparse / rest-like). Special `Sanji_1290` / `0500` pose better in inspector.
- Bravo facing: Nami/Usopp backs to camera in current landscape alpha=0 framing (teams face across X).
- Nami remaining body (11 meshes) still recognizable with orange hair + staff in battle shot.
- Usopp cape/hat readable in battle shot.

## Config
`excludedMeshIndices` in `app/src/inspector/previewConfig.ts`:
- Sanji: 0,5,6,7,10,12,24
- Nami: 4–12,17,18,20,23
- Usopp: 0,4,9–14,16,17,19–21,24,31,33,35
