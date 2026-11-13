# REVIEW #30 — Combat safety, switchable lineups, Guard cap, GLB slot remap

**Branch:** `research/phase-1-extraction`  
**Addresses:** #27 gate on `f4343c5` / implementation `c498fd7`  
**SHA:** `167be48e68dca7439ba251ed17331932ff06fc1d` (tip `b945ce9` stamps this report)

## A — Combat correctness + lineups

- Missing skinned view/clip → **abort** via `resolveModeForAction` (no silent contact). Instant-resolve only when `manifest.assetId == null` (synthetic/headless).
- Guard capped at `MAX_GUARD_CHARGES = 1`; charge shown on actor + unit cards; reduced hit logged as `(guarded from N)`.
- Two in-app lineups (same four models): `Zoro+Sanji vs Nami+Usopp` and `Zoro+Nami vs Sanji+Usopp`. Ally controls / AI derive from **team**, not hard-coded character ids. Assets/slots from `lineups.ts` + `slotsForLineup`.
- Browser GLB playthrough: Basic → Guard → Special path → Nami/Usopp AI turns → Victory alpha (event log captured in automation).

## B — Active-turn HUD + true 16:9

- Drawing buffer forced **1280×720** in battle load.
- Commands (Target + Basic/Special/Guard/Reset) sit above HP cards; diagnostics collapsed.
- Soft arena rim (smaller black wedge). Camera radius ~480.
- Screenshots:
  - `reports/review30-active-controls.png` — active Zoro turn with lineup + Target + skill row
  - `reports/review30-canvas-1280x720.png` — canvas-only at 1280×720
  - `reports/review30-glb-embedded.png` — concurrent four-GLB embedded materials

## C — GLB visual gate (honest)

- Zoro slots now mirror Noesis `materialSlotByMesh` + mouth `sheetByMesh` (`tools/glb_slots/zoro.json`). Prior identity mapping baked wrong orange cloth.
- Matrix labels separated in `reports/GLB_EXPORT_MATRIX.md`: structural / embedded / **visual parity** / action playback.
  - Zoro visual parity: **PARTIAL** (remap applied; white/dark clothing restored in canvas shot vs prior orange; reconstructed sheets ≠ authenticated original).
  - Sanji/Nami/Usopp visual parity: **UNVERIFIED** (matched pose audit still open).
- GLB battle used `preferEmbeddedTextures` (no temporary-look). Action playback exercised in browser.

## D — Verify

- `npm test` → **25** passed (Guard cap, resolve policy, mixed lineup, 5v5+Guard, energy, AI).
- `npm run build` → green.

## E — P2 note

- Headless 10-unit 5v5 retained. Rendered ten-synthetic pipeline deferred until owner accepts P0/P1.
- Noesis remains battle default until visual parity gates pass.
