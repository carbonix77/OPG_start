# REVIEW #29 — Playable 2v2 + Guard + textured four-GLB Babylon smoke

**Branch:** `research/phase-1-extraction`  
**Addresses:** #26 ChatGPT gate on `9f67a76` (2026-11-12) — P0 playable UI/Guard, P1 mesh-bound textured GLBs + Babylon concurrent load, P2 data-driven lineup + 5v5 Guard path.  
**SHA:** `a436d5f` (gate `c498fd7`)

## A — Browser playthrough (Noesis default)

- Battle mode: canvas above compact HUD (Actor / EN / Queue / HP·EN cards / Target / Basic·Special·Guard / Reset). Diagnostics collapsed under `<details>`.
- Chronological resource log excerpt (Noesis victory seed 21):
  - Zoro/Sanji Basics build energy; player Special used when affordable (Sanji Onigiri path).
  - Nami and Usopp took independent AI turns (basic/special/guard).
  - Usopp Guard halved a later hit (`contact … (guarded from 18)`).
  - KO → `Winner alpha` → Reset restores HP/EN/Guard.
- Screenshots:
  - `reports/review29-victory-controls.png` — full viewport with controls + Victory
  - `reports/review29-canvas-only.png` — landscape canvas (1280×626) with all four fighters

## B — Tactical mechanic: Guard

- Skill `guard`: self-target, −1 EN, grants 1 charge; next incoming hit ×0.5 then consumes charge (`GUARD_DAMAGE_FACTOR`).
- UI: Guard button + `Guard×N` / `G1` markers. Labeled custom tactical (not authentic PW4).
- AI: low-HP bravo may Guard (seeded).
- Tests: Guard halve + `startEnergy` preserved on reset; 5v5 path forces Guard uses and expects a guarded contact.

## C — Four Babylon-tested GLBs (embedded-only)

Blender `D:\blender\blender.exe` 5.2.2 LTS · `python tools/export_all_characters.py`  
Binaries local/gitignored under `private-assets/glb/`.

| Char | Status | Size | Clips | Bones | Tex meshes (export) | Embedded images (reimport) | Babylon concurrent (embedded-only) |
|------|:------:|-----:|------:|------:|--------------------:|---------------------------:|------------------------------------|
| Zoro | PASS | 7.36 MB | 9 | 141 | 37 | 9 | 39 meshes, 141 joints, **36** embedded textures, all clips+durations logged |
| Sanji | PASS | 6.79 MB | 6 | 324 | 32 | 4 | 25 meshes, 324 joints, **25** embedded |
| Nami | PASS | 4.48 MB | 3 | 158 | 24 | 5 | 11 meshes (hide preset), 158 joints, **11** embedded |
| Usopp | PASS | 5.74 MB | 3 | 319 | 37 | 5 | 20 meshes (hide preset), 319 joints, **20** embedded |

- Mesh-slot bind via `tools/glb_slots/*.json` + exporter PASS/PARTIAL/FAIL matrix (`reports/GLB_EXPORT_MATRIX.md`).
- Battle **Asset source → Blender GLB** skips temporary-look override (`preferEmbeddedTextures`) so this smoke is self-contained materials, not runtime sheet remap.
- Full submeshes retained in source GLB; Babylon hide preset reversible (Show All).
- Screenshot: `reports/review29-glb-four-embedded.png` (mid-fight Guard×1 visible).
- Honest limits: reconstructed local sheets ≠ authenticated original shading; Zoro alpha/transparency can look thin under flat lighting; Noesis remains canonical battle default until owner accepts parity.

### Sample Babylon duration inventory (GLB)

- Zoro: `0000:1.333s` · `0500:1.25s` · `0650:2.167s` · `1320/1322/1324:6.792s` · `1330:6.625s` (+ phantoms present)
- Sanji: `0000:1.542s` · `0500:1s` · `1290:1.958s` · `1300:2.5s` · `1310:4.75s` · `1330:5.792s`
- Nami: `0000:2.042s` · `0500:1s` · `1300:4.75s`
- Usopp: `0000:1.042s` · `0500:1.333s` · `1300:6.625s`

## D — Verify

- `npm test` → **23** passed (energy gates, Guard, lineup helper, 5v5+Guard, 2v2 to winner, AI replay, reset).
- `npm run build` → green.
- Mid-action busy disables asset-source switch; Reset / unmount dispose units.

## E — P2 lineup

- `app/src/combat/lineups.ts` · `LINEUP_2V2_STRAW_HAT` + `lineupToSpawns` drives BattlePanel (no hard-coded spawn literals).
- Headless `makeBalancedFiveVFive` still runs; Guard mixed into the 5v5 test loop.

## Desktop env (smoke)

- Windows 10.0.26200 · Vite `127.0.0.1:5173` · Chromium automation tab · canvas 1280×626.
