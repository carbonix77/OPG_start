# Dual-character battle runtime

Issue #23 accepted lifecycle work and required Zoro and Sanji together on independent roots.

## Multi-root loader

`CharacterUnitView` owns one `LoadAssetContainerAsync` import per unit id: private root, clips, contact token, recenter, and dispose. Battle mode calls `InspectorScene.prepareBattleScene()` so the old single `previewRoot` character is cleared before both fighters load.

## Sanji clip inventory

Bounded search under `Sanji/`, `private-assets/validation/merge-sanji/`, and the owner PW4 install root:

- Present: `Sanji_1290`, `1300`, `1310`, `1330` (+ camera siblings) only
- Missing locally: idle/basic-style `Sanji_0000` / `Sanji_0500` (and nearby `00xx`/`05xx`)
- Lucci / Crocodile model or G1A names: not found in the searched local trees

Stand-ins stay labeled provisional: idle `Sanji_1290`, basic `Sanji_1300`. No fabricated authenticity.

## 2v2 formation

- Alpha: Zoro (roster) + Sanji (specials export)
- Bravo: labeled interim synthetic enemies
- Wider four-slot arena, 16:9 battle frame, target select, independent action playback

## Perf (local Vite battle load)

- Zoro cold import ~298 ms (40 meshes, 9 clips)
- Sanji cold import ~336 ms (38 meshes, 4 clips)
- Heap after both ~111 MB (`performance.memory`)
- Mode switch disposes both `CharacterUnitView` containers and the arena/markers

## Evidence

- `reports/screenshots/battle-dual-zoro-sanji.png` — both skinned fighters + interim enemies
- `reports/screenshots/battle-dual-after-contact.png` — independent Sanji `Sanji_1300` action after Zoro contact

## Limits

- Sanji idle/basic still need owner-local G1A copies if true combat loops are required
- Lucci/Crocodile not found in searched local trees
- Dual skinned roots are the milestone; four real skinned fighters remain blocked on asset availability
