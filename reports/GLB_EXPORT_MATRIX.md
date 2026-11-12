# GLB export matrix (local files)

Blender: `D:\\blender\\blender.exe` (owner-authorized, 5.2.2 LTS). Binaries stay under ignored `private-assets/glb/`.

Statuses are **separate** (do not collapse into one PASS):

| Label | Meaning |
|-------|---------|
| structural | source vs GLB clips/bones/meshes |
| embedded | mesh-bound textures present in file |
| visual parity | matched Noesis vs embedded-GLB look (honest) |
| action playback | idle/basic/special sampled in Babylon battle |
| memory/perf | measured separately in REVIEW |

| Character | structural | embedded | visual parity | Size | Clips | Bones | Tex meshes | Images |
|-----------|:----------:|:--------:|:-------------:|-----:|------:|------:|-----------:|-------:|
| zoro | PASS | PASS | PARTIAL (slot remap applied; verify in REVIEW30 shots) | see report | 9→9 | 141→141 | 37 | 9 |
| sanji | PASS | PASS | UNVERIFIED | | 6→6 | 324→324 | 32 | 4 |
| nami | PASS | PASS | UNVERIFIED | | 3→3 | 158→158 | 24 | 5 |
| usopp | PASS | PASS | UNVERIFIED | | 3→3 | 319→319 | 37 | 5 |

## Notes
- Zoro `tools/glb_slots/zoro.json` now mirrors `ZORO_PREVIEW.materialSlotByMesh` + mouth `sheetByMesh` (was identity → wrong orange cloth).
- Textures are reconstructed from local decoded PNG + map/slots (not authenticated original shading).
- Full geometry retained; Babylon hide preset remains reversible.
- Battle GLB mode uses `preferEmbeddedTextures` (no temporary-look override).
- Re-run: `python tools/export_all_characters.py`
