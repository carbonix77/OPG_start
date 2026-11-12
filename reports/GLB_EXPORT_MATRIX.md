# GLB export matrix (local files)

Blender: `D:\\blender\\blender.exe` (owner-authorized, 5.2.2 LTS). Binaries stay under ignored `private-assets/glb/`.

Statuses are **separate** (do not collapse into one PASS):

| Label | Meaning |
|-------|---------|
| structural | source vs GLB clips/bones/meshes |
| embedded | mesh-bound textures present in file |
| visual parity | matched Noesis vs embedded-GLB look (honest) |
| action playback | idle/basic/special sampled in Babylon battle |
| memory/perf | measured in REVIEW31 |

| Character | structural | embedded | visual parity | action playback | Notes |
|-----------|:----------:|:--------:|:-------------:|:---------------:|-------|
| zoro | PASS | PASS | PARTIAL | PASS | Slot remap restores white/dark clothes vs prior orange; reconstructed sheets ≠ authenticated |
| sanji | PASS | PASS | PARTIAL | PASS | Load+battle OK; matched pose audit still informal |
| nami | PASS | PASS | UNVERIFIED | PASS | Embedded battle OK; fidelity not proven |
| usopp | PASS | PASS | UNVERIFIED | PASS | Embedded battle OK; fidelity not proven |

## Notes
- Zoro `tools/glb_slots/zoro.json` mirrors Noesis `materialSlotByMesh` + mouth `sheetByMesh`.
- Battle GLB mode uses `preferEmbeddedTextures` (no temporary-look override).
- Full geometry retained; hide preset reversible.
- Re-run: `python tools/export_all_characters.py`
