# Blender character-cleanup experiment (gated)

**Status:** Owner authorized existing install at `D:\blender\blender.exe` (verified Blender 5.2.2 LTS). Do not re-download or reinstall.

**Batch export:** `python tools/export_all_characters.py` → local `private-assets/glb/*.glb` + `reports/GLB_EXPORT_MATRIX.md`.

## Rules
- Offline experiment only. Does **not** replace the working Noesis → Babylon battle path yet.
- No 3DMigoto, no game-directory mods, no public commit of models/textures/GLBs.
- Packages live under ignored `private-assets/blender/<character>/`.
- Git may receive plain-text tools, manifests, and this doc only.

## Package layout (local)
```
private-assets/blender/<character>/
  SOURCE.txt                 # paths + clip list + hide indices
  merged.gltf + merged.bin   # copy of Noesis merge (local only)
  textures/                  # decoded PNG copies + map.json
  materialSlotByMesh.json    # from previewConfig
  excludedMeshIndices.json
  ROUNDTRIP.md               # filled after Blender run
```

Prepare copies with:

```
python tools/prepare_blender_package.py sanji
python tools/prepare_blender_package.py nami
python tools/prepare_blender_package.py usopp
python tools/prepare_blender_package.py zoro
```

## Sanji-first round trip (after owner installs Blender)
1. Import `merged.gltf` with built-in glTF 2.0 (do not apply transforms / rest-pose edits).
2. Verify skeleton, mesh IDs, UVs, actions `Sanji_0000`, `Sanji_0500`, `Sanji_1300`.
3. Export temporary `.glb` with skins + all actions (try Actions and NLA; record which preserves names).
4. Re-import GLB into a fresh Blender scene **and** Babylon inspector (`existing-glb`-style local path).
5. Compare bone count/names, skin influences, mesh parts, clip names/durations, screenshots.
6. If the no-edit round trip loses bones/clips/deforms clothing: **stop** and document in `ROUNDTRIP.md`. Do not hand-edit until that passes.
7. Only then attempt non-destructive material/weight fixes for trousers / back-cloth / hands. Keep collections for body / clothing / props / artifacts.
8. Add a local asset-source toggle later (`raw Noesis` vs `Blender GLB`) — default stays Noesis until fidelity matches or beats it.

## Why this is gated
Issue #26 follow-up: stable 2v2 must not wait on Blender. Hide preset remains the provisional presentation default with a Show All diagnostic override.
