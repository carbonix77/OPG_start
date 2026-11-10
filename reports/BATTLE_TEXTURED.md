# Textured dual-character battle

Issue #24 accepted the multi-root integration and required recognizable textures plus player-controlled ally turns.

## P0 textures

- `CharacterUnitView.load` now calls `applyTemporaryLook` per unit using that unit's `PreviewConfig`.
- Zoro reuses roster provisional mesh→slot→sheet mapping (including mouth `sheetByMesh` weapon caveat).
- Sanji uses **Sanji-local** sheets under `preview/textures/sanji` (`face`/`skin`/`cloth`/`hair` + normals). Not Zoro's atlas.
- `merge-sanji` body meshes are `model_0_submesh_N` without `Material_N`, so Sanji `materialSlotByMesh` is identity into `map.json`.
- `meshIndexOf` accepts battle-prefixed names (`unit-<id>-Mesh_N` / `…submesh_N`).
- Looks restore on dispose; no shared TemporaryLook across units.

## P1 control / lifecycle

- Basic Attack follows the **current alive ally** (Zoro or Sanji), using that actor's manifest skill/clip/target.
- Enemy turns still auto-resolve with session-scoped timeouts cleared on reset/mode switch/dispose.
- Battle UI compacted; camera radius lowered for readable 16:9 framing.

## Inventory notes

- Sanji clips still only `1290/1300/1310/1330` locally (provisional idle/basic).
- Lucci/Crocodile still absent in searched local trees → interim enemy placeholders remain.
