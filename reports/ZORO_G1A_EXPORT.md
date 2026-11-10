# Zoro G1A merge test

Date: 10 November 2026. This follows the review on issue #5.

The game directory was not modified. No mod loader was installed. `preview/zoro.glb` was not replaced. Exports stayed in `private-assets/validation/`, which Git ignores. No new program was downloaded for this step.

## What the menu item actually does

In Project G1M v1.8.2, **Tools → Project G1M → Merge all assets in the same folder** is a saved checkbox, not an exporter. The source for that statement is `Source/Public/Options.h` at tag `v1.8.2`: the checkbox calls `NPAPI_UserSettingWrite` with the key `g1m::merge`. While it is on, loading a G1M also reads every `.g1m`, `.g1t`, `.g1a`, `.g2a`, and `.oid` in the same folder.

`Noesis64.exe ?runtool "Merge all assets in the same folder" <file.g1m>` calls that same checkbox. It returns exit code 1, which is the plugin function's own return value. Each call flips the saved value. It does not write a file by itself.

There was no separate plugin log. The glTF animation list is the record.

## Steps

1. Copy `MPLC001_Zoro.g1m`, `MPLC001_Zoro.oid`, and `Zoro_1330.g1a` into an empty folder. No texture files were included.
2. Call `?runtool` once. The following `?cmode` export had **0** animations, so that call had turned the checkbox off.
3. Call `?runtool` again. `?cmode` then wrote `merged-b.gltf`.
4. With the checkbox still on, repeat the export in a second folder that contained `Zoro_1320.g1a`, `Zoro_1322.g1a`, and `Zoro_1324.g1a`.
5. Call `?runtool` once more. A control export of the 1330 folder then had **0** animations again. The checkbox was left off.

## Exported clips

| Clip | Channels | Translation tracks | Rotation tracks | Duration | Input keys |
|---|---|---|---|---|---|
| `Zoro_1330` | 186 | 94 | 92 | 6.6333 s | not separately counted |
| `Zoro_1320` | 228 | 135 | 93 | 6.8167 s | 333 |
| `Zoro_1322` | 114 | 43 | 71 | 6.8167 s | 333 |
| `Zoro_1324` | 113 | 43 | 70 | 6.8167 s | 333 |

The mesh side of these files is still 40 meshes and 206 nodes. The `.oid` file supplies bone names. The root that travels is named `SK_Skeleton`, not `bone_0`. The mesh-only export, which had no `.oid` beside it, still uses `bone_N`.

## Comparison with the clips already inside `preview/zoro.glb`

Those four clips were read from the GLB tracks. They were not played on screen. There is no viewer in this project that plays the GLB's animation list. The Three.js page plays separate `.bin` clips.

| GLB clip | Channels | Duration | Largest translation span |
|---|---|---|---|
| `1300` | 270 | 2.0000 s | `bone_1`, 26.44 / 52.78 / 62.73 |
| `1310` | 270 | 6.1000 s | `bone_1`, 22.68 / 55.34 / 1378.82 |
| `1320` | 270 | 6.8500 s | `bone_1`, 26.30 / 34.16 / 857.62 |
| `1330` | 242 | 6.6833 s | `bone_1`, 24.84 / 31.10 / 564.78 |

The fresh Noesis export of `Zoro_1320` moves `SK_Skeleton` by 26.30 / 34.16 / 857.62. That matches the GLB clip `1320` on `bone_1` to the hundredth. The second-largest mover also matches: Noesis node `0x43b3b303` and GLB `bone_59` both span 77.22 / 65.91 / 70.81.

`Zoro_1330` is close and not identical. Noesis `SK_Skeleton` spans 24.84 / 31.28 / 564.78 over 6.6333 s. The GLB clip spans 24.84 / 31.10 / 564.78 over 6.6833 s. Channel counts differ, 186 against 242.

`Zoro_1322` and `Zoro_1324` last the same 6.8167 s as `Zoro_1320` and move `SK_Skeleton` by almost the same Z distance, 857.56 against 857.62. They are separate clips for the extra bodies. They are not in the old GLB.

The travel is in the clip. `SK_Skeleton` / `bone_1` moves hundreds of units on Z. That is root motion, not an in-place animation. `bone_0` is not the track that moves.

## What this does not decide

- The Noesis glTF is still not the runtime file. It has the new clips and, in this test, no textures. The old GLB has 37 materials and four clips under different bone names.
- Bone names do not match between the two files, so they cannot be mixed by name. The motion numbers above are the evidence that GLB `bone_1` corresponds to `SK_Skeleton` for these two attacks.
- Sword visibility was not changed.
- No screenshot was taken.
- The checkbox is off again. A later export will not pick up G1A files until `?runtool` is used an odd number of times from this off state, or the menu item is checked in the GUI.
