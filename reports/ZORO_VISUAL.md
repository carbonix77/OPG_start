# Sword evidence and textured Asura copies

`Zoro_0000` stays a provisional combat idle. `Zoro_0060` and `Zoro_0061` stay unconfirmed reaction candidates. `Zoro_0500` stays the basic attack candidate. `Zoro_0650` stays the combo-order Oni Giri candidate. `Zoro_1330` stays Charming Demon Sleepless Night Onigiri. `Zoro_1320` stays the Asura main animation. `Zoro_1322` and `Zoro_1324` stay separate phantom tracks. None of this is final visual acceptance, and it is not verified Asura.

The samples are on `private-assets/validation/merge-roster/merged.gltf`. Show all is the diagnostic default. The dark band in the stills is the inspection ground. It was not restaged.

## Sword matrix

Every labeled clip was sampled at 0, 0.25, 0.5, 0.75, and 1. Each listed mesh is rigid: the peak weight on every vertex is 1. `maxGap` is the farthest center distance from the highest-vertex mesh on that same bone. A small gap is not treated as permission to delete the mesh.

| Mesh | Bone | Vertices | Longest | maxGap | Reading |
|---|---|---|---|---|---|
| 17 | `SK_L_Weapon` | 1032 | 145 | 0 | Kept hand blade |
| 27 | `SK_L_Weapon` | 516 | 145 | 0.07 | Same length and place as 17 |
| 39 | `SK_R_Weapon` | 1268 | 145 | 0 | Kept hand blade |
| 33 | `SK_R_Weapon` | 994 | 145 | 0 | Same length and place as 39 |
| 30 | `SK_R_Weapon` | 516 | 145 | 0.08 | Same length and place as 39 |
| 36 | `0x43b3b303` | 803 | 150 | 0 | Mouth blade. Child of `SK_Head` |
| 16, 26 | `0x7ede6180` | 760, 297 | 33 | 0 to 0.52 | Short hip piece |
| 15, 25 | `0x7ede6180` | 384, 155 | 91 | about 74 | Longer piece, not the same shell |
| 38, 32, 29 | `0x8a94f061` | 1068, 881, 326 | 39 | 0 to 0.16 | Short hip piece |
| 37, 31, 28 | `0x8a94f061` | 526, 253, 155 | 113 | about 75 | Longer piece, not the same shell |
| 35 | `0x964b7f42` | 457 | 37 | 0 | Short hip piece |
| 34 | `0x964b7f42` | 221 | 104 | 75 | Longer piece, not the same shell |

Confirmed hand shells hides 27, 30, and 33 for the current action. Hip and mouth meshes stay. After `Zoro_0500` returned to `Zoro_0000`, those three meshes were enabled again.

`zoro-visual-0500-before.png` is Show all at halfway. `zoro-visual-0500-after.png` is the same time with those three hand shells hidden. The hip cluster is still there. The long hip meshes are separate skinned parts, about 75 units from the short pieces on the same bone, so they were not hidden. That is the blocker for a three-sword presentation.

## Mouth blade

Mesh 36 UVs on this file: u at the 5th, 50th, and 95th percentile is 0.04, 0.23, 0.95. v is 0.06, 0.42, 0.87. The samples cover 45 of 64 eight-by-eight cells. The Noesis glTF has no material array and no G1T index. The local inventory still has 56 G1T files and twelve decoded sheet names. `map.json` sending slot 33 to `cloth` is the reconstructed baseline, not a recovered index.

`zoro-visual-mouth-cloth.png` is that baseline at `Zoro_1330` normalized 0.35. `zoro-visual-mouth-weapon.png` puts the whole `weapon.png` atlas on mesh 36 only. The blade reads darker, and the same UV span also picks up other parts of the atlas, including a round mark. That test is provisional. It was not kept. The crop was not retuned.

## Textured copies

`zoro-visual-asura-before.png` is `Zoro_1320` with `Zoro_1322` and `Zoro_1324` at normalized 0.25, before the material map. `zoro-visual-asura-after.png` is the same pose after the copies receive the same mesh-to-sheet map as the main body. The three poses stay different. Turning the checkbox off left no phantom roots. Switching to the existing GLB left no `SK_` skeleton behind.

While `Zoro_1320` and the two copies were playing, the first second averaged 62.9 fps, with a low of 46.7 and a 95th percentile frame of 19.6 ms. The next four seconds averaged 60.1 fps, with a low of 55.0 and a 95th percentile of 17.3 ms. A held frame was in the same band. This spawn took 138 ms because the file was already loaded. The earlier fresh spawn was 1074 ms. The heap after the map was about 265 MB. This is one desktop window, not a mobile budget, and it is not verified Asura.

`Zoro_0500` still ends at local Z 263.49 with recenter off. Recenter hides world X/Z and does not edit the key.

## Idle and hit

No new G1A file was opened. `Zoro_0000` remains suitable only as a provisional local idle. `Zoro_0060` and `Zoro_0061` remain suitable only as unconfirmed local reactions. The sword gaps above are the throughout record for those clips, not a single midpoint.
