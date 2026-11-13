# REVIEW #33 — Contact segments, wide 5v5 camera, Replay/Shuffle

**Branch:** `research/phase-1-extraction`  
**Addresses:** ChatGPT gate on ISSUE #30 / REVIEW32 (`0dec8c8`)  
**Prior acceptance:** ten-distinct-skinned 5v5 smoke milestone

## A — Delivered against ordered requirements

### P0 — Precise contact (data-driven segment + single hit)

- `SkillDef.contactSegment?: number` — which clip in `[clipId, ...followClips]` owns the impact frame.
- `SkillDef.contactNote?: string` — calibration note for reviewers (not used by engine).
- `CharacterUnitView.playSkill` arms contact on the **chosen segment only**; still never invents contact on end/watchdog (`missed-contact` path unchanged).
- Calibrated representatives:
  | Skill | Segment | `contact` | Note |
  | --- | --- | --- | --- |
  | Zoro Oni Giri (`Onigiri`) | 0 | 0.55 | Mid-late slash |
  | Luffy Bazooka | 0 | 0.62 | Late stretch/impact |
  | Robin Clutch | **2** (`Clutch_3`) | 0.48 | Not Clutch_1 anticipation; single hit for the whole chain |
- Guard remains on manifests/engine; **intentionally omitted** from `primarySkills` (animation-test UI). Comment documents this as a temporary visibility choice — not a mechanic removal. **1-EN specials unchanged.**

### P1 — Usable 5v5 framing + Replay vs Shuffle

- Establishing camera is now **side-on** (`alpha = π/2`) so both ±X team rows fit a 1280×720 canvas; wide radius ~980.
- Temporary **action focus** zooms on attacker↔target midpoints; restores field camera on skill settle / missing-clip abort.
- **Replay** (5v5): rebuilds identical roster/sides from stored `lineup.seed`.
- **Shuffle** (5v5): new seed/roster. 2v2 keeps classic Reset (HP/EN).
- `LineupDefinition.seed` set by `buildRandom5v5Lineup(seed)`.

### Not claimed complete from #30 acceptance checklist

- Owner-controlled “pick 5 of 10” roster editor (Replay seed is the minimal deterministic path).
- Sampled video / frame-accurate Blender↔Babylon contact proof for all ten characters.
- Full ten-GLB match-to-victory with measured FPS/p95/GPU texture memory.
- Bounded VFX (P3 — deferred).

## B — Verify

```text
cd app
npm test
npm run build
```

**Results on this package:** `npm test` → **29 passed**; `npm run build` → green.

## C — Browser evidence

| File | What |
| --- | --- |
| `reports/review33-5v5-full-field.png` | Full browser viewport; both teams + pads visible; Replay + Shuffle buttons |
| `reports/review33-canvas-1280x720.png` | Canvas-only 1280×720 establishing frame |

Observed: both team rows in frame after camera fix (previously only one row). Replay/Shuffle present on 5v5 HUD. Heap sample during session ~351–357 MB used.

Honest runtime note: one AI turn logged `chopper finished Im_A_Doctor without contact` (missed-contact abort path — no phantom damage). Worth a follow-up contact tweak for that clip; P0 no-phantom-contact behavior held.

## D — Questions for ChatGPT

1. Are Onigiri `0.55` / Bazooka `0.62` / Clutch segment-2 `0.48` acceptable provisional calibrations pending owner video sampling?
2. Is Replay-by-seed sufficient for P1, or is an explicit pick-5 UI still required before ACCEPT?
3. Should support/heal specials (e.g. Chopper `Im_A_Doctor`) use an earlier contact ratio or a dedicated contact policy when they miss?
