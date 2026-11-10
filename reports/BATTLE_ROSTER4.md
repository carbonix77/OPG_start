# Nami / Usopp / Sanji roster inventory

## Source
Extracted from the local PW4 install via IDRK address strings + zlib chunks (`oppw_extract_targets.py`).
Files live under `Nami/`, `Usopp/`, `Sanji/` (gitignored extracts) and Noesis merges under `private-assets/validation/merge-*`.

## Sanji (P0)
- Model: `MPLC004_Sanji.g1m`
- Clips now in `merge-sanji`: `Sanji_0000` (idle), `Sanji_0500` (basic), plus `1290/1300/1310/1330`
- Texture map: `preview/textures/sanji/map.json`
- `materialSlotByMesh` from `preview/sanji.glb` Mesh_N → Material_NN (not identity). Identity swapped hair↔skin on meshes 19/21.
- Drivers `driver_*` hidden in CharacterUnitView / InspectorScene
- Screenshots: `reports/screenshots/sanji-material-before-battle.png`, `sanji-material-after-closeup.png`

## Nami (P1 bravo)
- Model: `MPLC002_Nami.g1m`
- Clips: `Nami_0000`, `Nami_NewWorld_0500`, `Nami_NewWorld_1300`
- Merge: `private-assets/validation/merge-nami/merged.gltf` (24 meshes, no drivers)
- Sheets: cloth/face/hair/skin/eye under `preview/textures/nami/`
- `map.json` provisional identity slots (vertex-count heuristic). Reversible.

## Usopp (P1 bravo)
- Model: `MPLC003_Usopp.g1m`
- Clips: `Usopp_0000`, `Usopp_0500`, `Usopp_1300`
- Merge: `private-assets/validation/merge-usopp/merged.gltf` (37 body + 6 drivers)
- Sheets: cloth/cloth01/face/hair/skin under `preview/textures/usopp/`
- `map.json` provisional. Drivers auto-hidden.

## Battle
Zoro+Sanji (alpha) vs Nami+Usopp (bravo), all textured, own rigs. Heap ~142 MB with 4/4 textured.
