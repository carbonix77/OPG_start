# GLB export matrix (local files)

Blender: `D:\\blender\\blender.exe` (owner-authorized, 5.2.2 LTS). Binaries stay under ignored `private-assets/glb/`.

Status: **PASS** = clips + mesh-bound textures · **PARTIAL** = clips OK, textures incomplete · **FAIL** = missing clips/file.

| Character | Status | Size | Clips src→glb | Missing | Bones | Meshes | Tex meshes | Images | Babylon smoke (embedded-only) |
|-----------|:------:|-----:|--------------:|---------|------:|-------:|-----------:|-------:|-------------------------------|
| zoro | PASS | 7362004 | 9→9 | — | 141→141 | 41→41 | 37 | 9 | 36 embedded textures · 9 clips+durations · concurrent 2v2 OK |

- Zoro phantoms in source: ['Zoro_1322', 'Zoro_1324']; in GLB: ['Zoro_1322', 'Zoro_1324'].
| sanji | PASS | 6791856 | 6→6 | — | 324→324 | 39→39 | 32 | 4 | 25 embedded · 6 clips+durations · concurrent OK |
| nami | PASS | 4480624 | 3→3 | — | 158→158 | 25→25 | 24 | 5 | 11 embedded (after hide) · 3 clips+durations · concurrent OK |
| usopp | PASS | 5744864 | 3→3 | — | 319→319 | 44→44 | 37 | 5 | 20 embedded (after hide) · 3 clips+durations · concurrent OK |

## Notes
- Textures are reconstructed from local decoded PNG + `map.json` / mesh slots (not authenticated original shading).
- Full geometry retained; Babylon hide preset remains reversible presentation.
- Battle GLB mode uses `preferEmbeddedTextures` (no temporary-look override) for self-contained validation.
- Re-run: `python tools/export_all_characters.py`

