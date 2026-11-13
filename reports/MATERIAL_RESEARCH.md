# Mouth and hip material research

Bounded offline scan only. No Blender install. No 3DMigoto. No game modification.

## Method

`tools/g1m_material_scan.py` reads the local `MPLC001_Zoro.g1m` copy under `private-assets/validation/merge-roster/` and searches for embedded ASCII texture-family strings (`cloth`, `weapon`, `weapon00`–`weapon04`, `kidsalb`, and related names).

## Result

- File size 1,679,956 bytes. Header `_M1G`.
- Needle hits: none.
- Interesting printable runs tied to texture/material names: none.

The Noesis glTF still has no materials array. `map.json` remains a reconstructed assignment. Mesh 36 continues to use the whole `weapon.png` sheet through `sheetByMesh` after owner confirmation of that look. Hip meshes stay visible under show-all; they are not deleted by proximity.

## Go / no-go

**No-go** on changing mouth or hip visibility/material treatment from this G1M string scan alone. Defer further cosmetic work until an original index table or approved frame evidence exists.
