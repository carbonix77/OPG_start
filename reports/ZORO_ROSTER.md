# Zoro roster on one skeleton

This pass puts the six required clips, plus `Zoro_0061`, on one `SK_Skeleton`. It does not choose a canonical model. `Zoro_0000` stays a provisional combat idle. `Zoro_0500` stays a basic attack candidate. `Zoro_0650` stays the combo-order Oni Giri candidate. `Zoro_1330` stays Charming Demon Sleepless Night Onigiri. `Zoro_0060` and `Zoro_0061` stay possible hit or knockback reactions. `Zoro_1320` stays the Asura main animation. Those words are the labels in the Behavior list.

The file is `private-assets/validation/merge-roster/merged.gltf`. It is gitignored. `control.gltf` in that folder names none of the clips, so the merge checkbox was left off.

## Playback

Recenter was off for the root samples. Local position is `SK_Skeleton`. Presentation recenter cancels world X/Z and does not edit keys.

| Clip | Duration | Root at the end | What the still shows | Confidence |
|---|---|---|---|---|
| `Zoro_0000` | 1.33 s | Near the origin. Head offset matches at the start and the end | Crouched stance, swords in the hands and at the hip | Provisional combat idle |
| `Zoro_0500` | 1.25 s | Local Z 263.49 | Halfway lunge, one sword thrust, hip swords overlapping | Basic attack candidate |
| `Zoro_0650` | 2.17 s | Local Z 874.33 | Airborne at 0.35, swords spread, body readable | Combo-order Oni Giri candidate |
| `Zoro_1330` | 6.63 s | Local Z 532.93 | Blade at the face, hip swords still visible | Named special |
| `Zoro_1320` | 6.82 s | Local Z 836.64 | Wide stance in the center of the phantom still | Asura main animation |
| `Zoro_0060` | 0.23 s | Root stays at Y 116.28 | Inverted tumble | Possible reaction. Not a confirmed hit |
| `Zoro_0061` | 0.23 s | Root stays at Y 116.29 | Different inverted tumble, legs up | Possible reaction. Not a confirmed hit |

`Behavior, then idle` played each action once. After the clip, the only started group was `Zoro_0000`, and local Z was about -1.4 rather than the action's end Z. The 0.28 s blend does not edit keys.

Head offset from the root, at normalized 0.5: `Zoro_0060` is about `[6.3, -45.3, 8.0]`. `Zoro_0061` is about `[-1.4, -49.4, 11.9]`. They are not the same pose. A short upside-down clip is not a confirmed hit.

## Idle and hit search

`Zoro_0000` returns to the same head offset at the end of the clip, and the root stays near the origin. `names.json` still has no idle or hit name, so the loop is not enough to call it the battle idle.

This pass did not open more G1A files. The unnamed set already exported stays as previously recorded: `Zoro_0001` matches this stance, `Zoro_0051` is aerial, `Zoro_0165` is a crouch, `Zoro_0006` and `Zoro_0003` do not finish where they start, and `Zoro_0050`, `Zoro_0071`, `Zoro_0604`, and `Zoro_1650` are other poses that do not return. None of those was relabeled.

## Asura copies

`Zoro_1322` and `Zoro_1324` are in the file as their own groups. The checkbox loads two more copies of the glTF. Each copy has its own skeleton and plays only its own clip. The main body keeps playing `Zoro_1320`. The copies stay hidden until that clip plays. Turning the checkbox off disposes them. After cleanup the scene had one skeleton again.

On a fresh load the two copies took 1074 ms. At the end of each phantom clip, local Z was still 836.64. With recenter on, world X was 160 and -160 and world Z was 0. While all three played, one desktop second averaged 60 fps and the lowest frame was about 54. That is not a mobile budget. The copies are untextured because the sheet pass runs on the main body only. This is not verified Asura.

## Swords and the mouth blade

Show all stayed the debug default. Mesh 2 stays out of the preview, is not in the 39-mesh list, and is still in the file. It is not in a sword group. Clearing `excludedMeshIndices` would draw it again. Every roster clip above was played with it disabled.

Mesh 36 is the mouth blade. Its material slot is 33, and the reconstructed map sends 33 to `cloth.png`. The mesh UVs still cover most of that sheet, from the earlier measurement, so a full-sheet swap cannot isolate a blade. No new crop was added. Mesh 36 sheet test can put `cloth`, `weapon`, or `weapon00` through `weapon04` on that mesh only. None of those is an authenticated original.

The hand and hip slots from the same map:

| Meshes | Role | Sheet |
|---|---|---|
| 17 | Left hand | weapon00 |
| 27 | Left hand | weapon01 |
| 30 | Right hand | weapon02 |
| 33 | Right hand | weapon03 |
| 39 | Right hand | weapon04 |
| 36 | Mouth | cloth |
| 15, 16, 25, 26 | Hip | cloth |
| 28, 31, 34, 37 | Hip | weapon01, weapon02, weapon03, weapon04 |
| 29, 32, 35, 38 | Hip | cloth |

`zoro-roster-0500.png` is Show all at halfway. `zoro-roster-0500-stacks.png` is the recorded stack preset at the same time. The hip swords still overlap, so that preset is not a three-sword fix. It stays opt-in.

`zoro-roster-0650.png` uses the body frame. The character is large enough to judge. That frame ignores sword bounds and raises the fill light only while it is on.

## Stills and the local video

- `reports/screenshots/zoro-roster-idle.png`
- `reports/screenshots/zoro-roster-0500.png`
- `reports/screenshots/zoro-roster-0500-stacks.png`
- `reports/screenshots/zoro-roster-0650.png`
- `reports/screenshots/zoro-roster-1330.png`
- `reports/screenshots/zoro-roster-0060.png`
- `reports/screenshots/zoro-roster-0061.png`
- `reports/screenshots/zoro-roster-phantoms.png`

`private-assets/review/roster-preview.webm` is 760,783 bytes, 1920×1080, and is not committed. It is `Zoro_0500` then the idle loop. The earlier cinematic WebM was left in place.

## Still open

Idle and hit are still candidates. The hip overlap is still visible under Show all. The mouth sheet is still the cloth baseline. Phantom copies are a diagnostic, not a finished Asura. Root motion is still stored in the clips. No canonical model is chosen.
