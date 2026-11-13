# REVIEW #31 — Visible HUD, forfeit safety, synthetic 5v5, GLB battle

**Branch:** `research/phase-1-extraction`  
**Addresses:** #28 gate on `fcf3e55`  
**SHA:** `5bbd1c3`

## A — Operable 2v2 HUD (1366×768)

- Battle HUD moved under the canvas in `main` (`.battle-dock`). Mode stays in a thin aside.
- At **1366×768**, Basic / Special / Guard / Reset measure **inView** (button bottoms ~609px < 768).
- Screenshot: `reports/review31-active-1366x768.png` — full viewport with enabled Basic+Guard, disabled Special at EN 1/5.
- Canvas drawing buffer **1280×720** (`engine.setSize`). True canvas pixels: `reports/review31-canvas-1280x720.png` (from `canvas.toDataURL`).
- Backdrop plane matches clear color (no black wedge box).

## B — Lineup playthroughs + failure policy

- Straw-hat and mixed lineups: browser Basic→Guard→Special→AI→Victory (automation logs in session).
- Enemy presentation abort uses `forfeitPendingAction` (refund + **advance turn**) so AI cannot infinite-retry. Player abort keeps the turn.
- Load failure disables commands and shows **Retry**. Bounded AI fail counter (`MAX_AI_FAILS=3`).
- Tests: `forfeitPendingAction` advances turn without damage; resolvePolicy abort/instant; Guard cap; mixed lineup.

## C — Rendered synthetic 5v5 (feasibility)

- `LINEUP_5V5_SYNTHETIC` — ten `SyntheticUnitView` capsules via the same unit-ID / turn / Guard / AI pipeline.
- `slotsForLineup` places **unique** pads for 1–5 per team (no modulo stacking).
- Browser result: **Victory alpha**, ~20s, 10 unit cards, heap ~61 MB (Chrome `performance.memory`).
- Screenshot: `reports/review31-synth-5v5.png`.
- Labeled feasibility only — not ten skinned GLBs / not mobile perf.

## D — GLB visual gate (honest)

- Concurrent embedded-GLB 2v2 battle screenshot: `reports/review31-glb-embedded.png`.
- Matrix categories separated (`reports/GLB_EXPORT_MATRIX.md`): Zoro visual PARTIAL; Sanji PARTIAL; Nami/Usopp UNVERIFIED.
- Noesis remains default. Matched same-timestamp four-way still informal (blocker: needs dedicated pose-hold capture pass).

## E — Verify

- `npm test` → **27** passed.
- `npm run build` → green.
