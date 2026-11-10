# Sanji mesh / material fix (P0)

## Diagnosis
Owner report: bare left trouser, stretched cloth on raised arm, yellow hand.

Root cause: `materialSlotByMesh` assumed identity or GLB slot order. Two issues:

1. **Hair↔skin swap** on meshes 19/21 when using identity into `map.json`. Fixed by using GLB `Mesh_N → Material_NN` where vertex counts match (mesh 19 → slot 21 skin, mesh 21 → slot 19 hair).
2. **Noesis mesh 10 ≠ GLB mesh 10.** GLB mesh 10 is 211 verts / Material_12 (face). Noesis mesh 10 is 871 verts with no GLB twin. Mapping it to face stretched face atlas onto a cloth-sized shell. Remapped to cloth slot 10.

Drivers `driver_*` are hidden in CharacterUnitView and InspectorScene.

## Clips
Extracted `Sanji_0000` (idle) and `Sanji_0500` (basic) from PW4; re-merged into `merge-sanji` with specials.

## Proof
- Before (identity / wrong slots in battle): `reports/screenshots/sanji-material-before-battle.png`
- After (corrected slots, special idle closeup): `reports/screenshots/sanji-material-after-closeup.png`
- Config: `SANJI_PREVIEW.materialSlotByMesh` in `app/src/inspector/previewConfig.ts` (Sanji-only, reversible).

## Residual risk
Nami/Usopp `map.json` assignments are provisional heuristics. Mid-arena scrambled shells may still need per-mesh sheet tweaks.
