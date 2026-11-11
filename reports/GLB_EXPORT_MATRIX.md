# GLB export matrix (local files)

Blender: `D:\\blender\\blender.exe` (owner-authorized, 5.2.2 LTS). Binaries stay under ignored `private-assets/glb/`.

| Character | GLB exists | Size | Source clips | GLB clips | Missing actions | Bones src→glb | Meshes src→glb | Textures applied | OK |
|-----------|:----------:|-----:|-------------:|----------:|-----------------|---------------|----------------|-----------------:|:--:|
| zoro | True | 5271368 | 9 | 9 | — | 141→141 | 41→41 | 0 | True |
| sanji | True | 5801740 | 6 | 6 | — | 324→324 | 39→39 | 6 | True |
| nami | True | 2292820 | 3 | 3 | — | 158→158 | 25→25 | 0 | True |
| usopp | True | 5467264 | 3 | 3 | — | 319→319 | 44→44 | 6 | True |

## Notes
- Full geometry retained (no deletion of owner hide-list meshes).
- Zoro GLB includes phantom clips `Zoro_1322` and `Zoro_1324` from the roster merge.
- Texture bind is best-effort from map.json; `textures_applied` may be 0 when Noesis materials lack matching names — Babylon still uses its temporary look path for battle.
- Vertex counts can shift slightly after Blender round trip; bone counts matched in this run.
- Reproducible command: `python tools/export_all_characters.py`

