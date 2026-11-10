# Battle slice

Issue #21 asked for a playable one-action RPG foundation, not more cosmetic polish.

## Deliverable

- Headless combat core in `app/src/combat/`: seeded initiative, HP, skills, target checks, contact-once damage, turn advance, victory.
- Character and skill data live in manifests. The engine does not hardcode Zoro ids.
- Battle preview mode in the inspector app: one Zoro roster body versus one synthetic box dummy.
- Basic Attack plays `Zoro_0500`, applies damage once at the configured contact marker, flashes the dummy, returns to `Zoro_0000`, then auto-resolves the dummy poke so Zoro can act again.
- Experimental skills `0650`, `1330`, and `1320` are selectable. They use the same transaction path.
- Automated tests cover seeded order, single contact, invalid/dead targets, three sequential attacks, fixture non-Zoro data, and a headless 5v5 of ten synthetic units.

## Timings

Contact markers are preview config values for gameplay sync. They are not recovered OPPW4 frame data.

## Material / hip research

`tools/g1m_material_scan.py` scans a local G1M for embedded texture-family strings. Result: no mesh-index-to-sheet table for mesh 36 or the hip group. Recommendation: **no-go** on changing the mouth/hip treatment from this scan alone. Keep show-all as the debug default. The reversible hand-shell preset stays opt-in. The mouth blade continues to use the whole `weapon.png` sheet via `sheetByMesh`.

## What still needs hand mapping for character #2

- Measured sword groups and excluded meshes
- Material slot / sheet overrides
- Skill clip names and contact markers
- Optional phantom clip list
- A registered asset id and preview config

## Browser check

`reports/screenshots/battle-basic-after-contact.png` shows dummy HP 42/60 after one Basic Attack (18 damage) and Zoro at 95/100 after the dummy poke. `battle-basic-contact-pose.png` is a held `Zoro_0500` contact frame with the synthetic box target. Warmup 1 s averaged 60.6 fps (min 46.5, p95 17.6 ms). Steady 4 s averaged 60.1 fps (min 54.4, p95 17.4 ms). Heap about 51 MB. Desktop only.

## Limits

- Not a polished 5v5 scene
- Not verified Asura choreography
- Idle and hit remain provisional
- Root motion keys are unchanged
- Dummy is synthetic geometry, not a second copyrighted character
- Hip overlap and mouth UV span remain documented blockers; deferred by the material no-go
