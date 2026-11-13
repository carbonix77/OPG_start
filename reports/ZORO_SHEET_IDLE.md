# Mesh 36 sheet test, sword stacks, and unnamed clips

This follows issue #8. The reconstructed texture map stays as a reversible diagnostic baseline. No canonical model was chosen. `preview/textures/zoro/map.json` was not edited. No source mesh was removed. No extracted clip was edited.

Screenshots stay in local `reports/screenshots/` and are gitignored. A reviewer reading GitHub cannot see them.

## What was run

```text
cd app
npm run dev
```

Page: `http://localhost:5173/`. The Existing GLB was used for the sheet and sword checks. The unnamed clips were played from `private-assets/validation/merge-idle/merged.gltf`. `npm run build` is the typecheck for this change.

The Noesis merge checkbox was left off. `merged.gltf` contains the five clip names below. A control export, `control.gltf`, contains none of them.

## Mesh 36 sheet test

`Mesh_36` is the only mesh on `Material_33`. The map assigns material 33 to `cloth`. The test replaces the albedo on `Mesh_36` only. Every other mesh keeps the map. The page restores the previous material when the test is cleared.

Isolated, `Mesh_36` is one horizontal blade. Every sheet below reads as a sword on that chart. None of them is a recovered G1T assignment.

| Test sheet | What the isolated blade shows | Decision |
| --- | --- | --- |
| `cloth` (map assignment) | White hilt, green and brown patterned blade. This is the mouth blade seen on the full textured character | Left in place |
| `weapon.png` | Purple hilt, dark blade. Same look as `weapon00` on this mesh | Not applied |
| `weapon00` | Purple hilt, dark blade | Not applied |
| `weapon01` | Black hilt with red marks, dark blade | Not applied |
| `weapon02` | White hilt with blue marks, dark blade | Not applied |
| `weapon03` | White hilt, plain silver blade | Not applied |
| `weapon04` | Black hilt, yellow-green edge | Not applied |

Confidence is medium that the UVs are a blade chart, and low that any one sheet is the original. Changing the map would replace the mouth blade with a different one, so `Material_33` stays on `cloth`.

Local frames: `zoro-m36-cloth.png`, `zoro-m36-weapon.png`, `zoro-m36-weapon00.png` through `zoro-m36-weapon04.png`.

## Sword stacks

`Mesh_17` and `Mesh_27` were each shown alone at the bind pose. Both are complete curved swords in the same place. They are not a hilt plus a blade, and they are not the same vertex count (`Mesh_17` has 1032, `Mesh_27` has 516). Their guessed sheets differ (`weapon00` and `weapon01`). Neither one was hidden.

`Mesh_30`, `Mesh_33`, and `Mesh_39` still share a bind center and have different vertex counts. They were not isolated again in this pass, and none of them was hidden.

The only diagnostic hide is "Hide tiny world-static meshes", which turns off `Mesh_3`, `Mesh_22`, `Mesh_23`, and `Mesh_24`. Those four have world travel 0 through `1330` and a longest axis under 8. "Show all meshes" remains the default, and the choice is not saved.

Local frames: `zoro-mesh-17.png`, `zoro-mesh-27.png`.

## Unnamed clips

`names.json` still has no idle, hit, damage, guard, wait, or stand. Five unnamed G1A files were merged with the model and its `.oid`. They stay separate clips. They were not retargeted onto the GLB `bone_N` skeleton.

| Clip | Noesis duration | Root Z from 0 to 1 | Mid-frame pose |
| --- | --- | --- | --- |
| `Zoro_0000` | 1.333 s | about 0 | Wide in-place combat stance, swords out |
| `Zoro_0001` | 1.333 s | about 0 | Same stance as `Zoro_0000` at the sampled frame. Fewer tracks in the reconstructed bin |
| `Zoro_0051` | 1.133 s | 0 | Aerial pose, arms wide, one knee up |
| `Zoro_0060` | 0.233 s | 0 | Body flung backward, swords leaving the hands |
| `Zoro_0061` | 0.233 s | 0 | Inverted, legs up, swords still in the hands |

Only one group was started at a time. The Noesis file is untextured. These poses are not a confirmed battle idle and not a confirmed hit. `Zoro_0000` and `Zoro_0001` are the closest in-place combat stances. `Zoro_0060` and `Zoro_0061` are the closest short reactions. Absence of a label is not evidence that a real idle or hit is missing, and a small root travel is not enough to name the clip.

Local frames, each at normalized time 0.5: `zoro-clip-0000.png`, `zoro-clip-0001.png`, `zoro-clip-0051.png`, `zoro-clip-0060.png`, `zoro-clip-0061.png`. The sidebar time label on those shots still says 0.00 because the scene handle moved the pose.

## Preview recenter

On the Existing GLB, clip `1330` at normalized time 1, `bone_1` local Z stayed 531.62. With preview recenter on, the preview parent moved to about (-1.65, 0, -531.62) and `bone_1` world Z became 0. The parent chain is `bone_1`, `bone_0`, `__root__`, `previewRoot`. The clip keys were not changed. Loop still restarts that motion from the start. This check was on `bone_1` in the GLB. It was not repeated on the Noesis `SK_Skeleton`.

## Not done

- No idle or hit clip is confirmed, so Asura `1322` and `1324` were not put on separate bodies.
- Noesis exports still have no textures.
- `map.json` is still a reconstructed assignment.
