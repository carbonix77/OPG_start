# Zoro moveset matrix

This pass plays more of the required behaviors on one skeleton. It does not verify idle or hit, and it does not relabel `Zoro_1330`. Show all stays the default. Mesh 2 stays out of the Zoro preview. No canonical model is chosen.

The new file is `private-assets/validation/merge-moves/merged.gltf`. It is gitignored. It contains `Zoro_0000`, `Zoro_0500`, `Zoro_0650`, `Zoro_0060`, and `Zoro_1320` on `SK_Skeleton`. The merge checkbox was turned off afterward: `control.gltf` in that folder names none of those clips.

## Five behavior slots

A slot counts as demonstrated only when this skeleton plays the clip and a screenshot shows a distinct pose. A name from `names.json` is not playback. Root motion is the follow node's local position with recenter off. Recenter hides world X/Z and does not edit keys.

| Slot | Source | Duration | What playback showed | Confidence |
|---|---|---|---|---|
| Idle | `Zoro_0000.g1a` | 1.33 s | Crouched combat stance. Root stays near the origin and returns at the end. Swords in the hands and at the hip. | Candidate. Not a verified idle. `Zoro_0001` remains the same sampled stance from the earlier file. |
| Basic attack | `Zoro_0500.g1a`, Normal attack 1, combo-order proof | 1.25 s | Starts in that stance. At halfway it is a lunge, one sword thrust forward and one held back. Root local Z ends at 263. | Candidate. Played. Not an effect-confirmed name, and not relabeled as the only basic attack. |
| Oni Giri | `Zoro_0650.g1a`, Onigiri, combo order `NNCC` | 2.17 s | Starts lower than idle (root Y about 49) and travels to local Z 874. At 0.35 it is airborne with the swords spread. | Candidate for the combo-step Onigiri. Not `Zoro_1330`. |
| Oni Giri special | `Zoro_1330.g1a`, Charming Demon Sleepless Night Onigiri | 6.63 s on the earlier present file | Already played there. Mouth blade comes to the face. Not in the new file. | Special 1. Not a basic attack. |
| Asura | `Zoro_1320.g1a`, Asura: Silver Mist | 6.82 s | Starts near the idle height and travels to local Z 837. | Played on this skeleton. Same duration family as the phantom clips. |
| Asura phantoms | `Zoro_1322.g1a`, `Zoro_1324.g1a` | 6.82 s each, already exported in `merge-1320` | Separate clips, not a second mesh in the file. Not instanced. | Not spawned. A phantom would be another copy of these meshes playing `1322` or `1324`. That copy is not in this pass. |
| Hit | No named hit file | `Zoro_0060` is 0.23 s | Root does not translate. At halfway the body is inverted and the swords have left the hands. `Zoro_0061` stays in the earlier unnamed-candidate file and was not relabeled. | Candidate reaction. Not a verified hit. |

`reports/screenshots/zoro-moves-idle.png` is `Zoro_0000`. `reports/screenshots/zoro-moves-0500.png` is `Zoro_0500` at halfway. `reports/screenshots/zoro-moves-0500-return.png` is the idle loop after `Zoro_0500` finished. `reports/screenshots/zoro-moves-0060.png` is `Zoro_0060` at halfway. `reports/screenshots/zoro-moves-0650.png` is `Zoro_0650` at 0.35.

## Idle, then 0500, then idle

The page button uses the configured attack clip. On this file that clip is `Zoro_0500`. `Selected clip, then idle` plays whichever clip is selected, if that clip is already in the file. After 2.2 s only `Zoro_0000` was still started, and the follow node's local Z was -1.46 rather than 263. The 0.28 s blend does not edit keys and does not remove the stored root travel. Recenter is what keeps the world jump hidden.

## Sword state

Show all was on for these frames. Nothing new was hidden.

| Clip | Hands | Mouth | Hip |
|---|---|---|---|
| `Zoro_0000` | Swords in both hands | Blade is not at the face | Hip swords stay visible |
| `Zoro_0500` halfway | One thrust, one held back | Not the mouth-blade pose from `Zoro_1330` | Hip swords still visible and overlapping |
| `Zoro_0650` at 0.35 | Swords spread in the air | Not established as a mouth sword | Hip group was not hidden |
| `Zoro_0060` halfway | Swords have left the hands | Not at the face | Hip swords still in frame |
| `Zoro_1320` | Not given a new hide rule | Not instanced with phantoms | Show all |

The experimental stack preset is unchanged and stays off until it is selected.

## Mouth material

Mesh 36 UVs still cover most of the sheet, about 45 of 64 cells, from the earlier measurement. A full-sheet swap cannot isolate a blade. No new crop was added. The existing crop remains a labeled stand-in and is not an original texture. Cloth stays the diagnostic baseline.

## One slow frame

The 13 fps sample from the previous cinematic measure was one frame. The 95th percentile gap on that same pass was 17.2 ms, and the counted rate was 59.3 fps over 7.29 s. The slow work is the first tip measurement: it walks the skinned vertices of the named sword meshes once, then keeps that local offset. Later frames do not repeat the walk. That is warm-up, not the steady rate.

## Exit gate

The five slots are not all demonstrated as final moves. Idle and hit are still candidates. Basic attack has one played candidate and a working return to `Zoro_0000`. Combo Onigiri and the named Onigiri special stay different clips. Asura plays, and its phantoms are still separate uninstanced clips. The gate stays open until a named hit is played or the search is recorded as exhausted, and until idle is confirmed by something stronger than a small root travel.
