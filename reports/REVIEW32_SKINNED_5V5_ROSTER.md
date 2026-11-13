# REVIEW #32 — Skinned 5v5 roster (Ace→Luffy) + fight smoke

**Branch:** `research/phase-1-extraction`  
**Code SHA:** `bd9ca3b` (roster wiring) + follow-up REVIEW32 docs/screenshots  
**GitHub issue:** [#30](https://github.com/carbonix77/OPG_start/issues/30)  
**Addresses:** Expand battle beyond Straw Hat core; random skinned 5v5; Luffy export + timing fix

## A — What shipped (code)

- Random **5v5** now fields **all wired skinned GLBs** (`SKINNED_BATTLE_ROSTER`): Zoro, Sanji, Nami, Usopp, Ace, Brook, Chopper, Robin, Franky, **Luffy**.
- With 10 skinned units, dummy fillers are **0** (full skinned field).
- New / updated manifests + preview configs + `assets.ts` entries for Ace/Brook/Chopper/Robin/Franky/Luffy.
- Clip mesh overrides of note:
  - Franky: `right_fist2` / `right_fist_3` on all clips; `weapon4` only on Radical Beam.
  - Brook: violin/holder show-hide per clip (unchanged this review).
- Luffy battle clips: `Idle`, `Attack`, `Block`, `Hit`, `Death`, `Bazooka`, `Gattling`.
- Luffy export helper: `tools/_export_luffy_battle_glb.py` (blend → slim `private-assets/glb/luffy.glb`; GLBs remain gitignored).
- **Bugfix:** Luffy Bazooka had `recovery: 1.05` which violated engine `recovery <= 1` and crashed 5v5 construction. Set to `1.0`.

## B — Tests

```text
cd app
npm test
```

**Result:** `28` passed (`src/combat/battle.test.ts`), including random 5v5 lineup + engine spawn with Luffy present.

## C — Browser fight smoke (2026-11-13)

Dev server: `http://127.0.0.1:5173/`

### Screenshots

| File | What it shows |
| --- | --- |
| `reports/review32-2v2-ready.png` | Straw-hat 2v2 ready; Loaded 4/4; Heap ~228 MB |
| `reports/review32-5v5-midfight.png` | Random roster 5v5 mid-fight; 10 unit cards; Luffy present; Actor Brook |
| `reports/review32-5v5-brook-basic.png` | After Brook basic → Ace; Ace 82/95; Usopp damaged |
| `reports/review32-5v5-robin-clutch.png` | Robin Clutch_1→7 multi-clip special in progress; Ace 54/95 |

### Observed runtime behavior

- **Load:** All 10 GLBs load (`luffy←glb-luffy` … 15 meshes / 741 joints; clips include Bazooka/Gattling).
- **Combat:** AI specials fire when energy allows (Sanji Diable Jambe → Usopp; Chopper I'm a Doctor → Usopp). Player Brook basic and Robin Clutch resolve with contact damage.
- **Heap (Chrome `performance.memory` during 5v5):** ~**360 MB used / 401 MB total** (vs ~228 MB on 2v2). Feasible on desktop; not claimed for mobile.
- **Camera honesty:** Follow/framing often favors the active-side row; opposing pads can sit off-frame in a single still. Unit cards still list all ten.

### Sample event log (session)

1. Sanji special → Usopp (34 dmg → HP 41)
2. Brook basic → Ace (13 dmg → HP 82; EN 2)
3. Chopper special-2 → Usopp (22 dmg → HP 19)
4. Robin special (Clutch chain) → Ace (contact progressing; Ace → 54/95 in clutch still)

## D — Local assets (not in git)

Rebuild Luffy battle GLB after blend edits:

```text
D:\blender\blender.exe --background --python tools/_export_luffy_battle_glb.py
```

Other roster GLBs: `python tools/trim_battle_glb.py <ace|brook|chopper|robin|franky|…>`

## E — Known limitations / questions for ChatGPT

1. Ten concurrent skinned GLBs (~360 MB heap) — acceptable desktop gate, or should 5v5 subsample the roster?
2. Camera should pull back / dual-team framing for review stills?
3. Luffy rubber-stretch scale keys on helper bones (Bazooka foot inflate) are edited in blend; any automated strip-scale policy for battle exports?
4. Contact timings for new specials are still placeholder ratios (startup/contact/recovery), not animation-synced hit frames.

## F — Verify checklist

- [x] `npm test` → 28 passed
- [x] 5v5 constructs with Luffy (timing fix)
- [x] Browser 5v5 loads 10/10 skinned and plays turns
- [x] Screenshots checked into `reports/review32-*.png`
