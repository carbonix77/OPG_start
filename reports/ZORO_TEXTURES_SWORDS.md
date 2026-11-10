# Temporary textures and sword roles

This follows the conditional pass on issue #7. The public report is the part a reviewer can check. The screenshots stay in local `reports/screenshots/` and are gitignored. A reviewer reading GitHub cannot see Zoro's appearance from those files.

No canonical model was chosen. No mesh was hidden. The texture assignment is the existing reconstructed `preview/textures/zoro/map.json`. It is not a recovered material-to-G1T index and it is not the game shader.

## What was run

```text
cd app
npm run dev
```

Page: `http://localhost:5173/`. The Existing GLB was loaded, then "Temporary textures" was turned on. Views and frames were taken from that page. `npm run build` is the typecheck for this change.

## Pose and defect matrix

The reviewer can read this table. The reviewer cannot see the images unless they are shared outside the repo.

| Shot | File | What is in the frame | Defect still visible |
| --- | --- | --- | --- |
| Front, bind | `zoro-tex-front.png` | Upright body, green hair, face, shirt, dark trousers, blades in both hands, one blade across the mouth, blades at the hip | Stacked blades |
| Face | `zoro-tex-face.png` | Scar on the closed eye, earring, hair above the forehead, sword through the mouth | Mouth blade uses the cloth sheet, not a weapon sheet |
| Back, bind | `zoro-tex-back.png` | Hair, sash, hip blades | Stacked hip blades |
| Camera left, bind | `zoro-tex-left.png` | Side view, several blades fanned at the hip and hands | Duplicate blades are obvious |
| Camera right, bind | `zoro-tex-right.png` | The other side, same fan | Duplicate blades |
| Three-quarter, bind | `zoro-tex-three.png` | Front three-quarter of the same rest pose | Stacked blades |
| `Mesh_36` only, bind | `zoro-mesh-36.png` | One horizontal blade left where the mouth sword sits | Its material is mapped to `cloth` |
| `1330` at 0.35 | `zoro-tex-1330-t035.png` | Crouched, two blades raised, one across the face | Frame 140. Sidebar on that shot still said clip `1300` because the scene handle moved the pose |
| `1330` at 0.65 | `zoro-tex-1330-t065.png` | Airborne, blades in the hands and one across the mouth. Root Z about 551 | Stacked blades |
| `1320` at 0.65 | `zoro-tex-1320-t065.png` | Three-quarter airborne pose, blades in both hands, one across the mouth, hip blades. Frame 267, root Z about 834 | Stacked blades. World-static meshes pull a full-bounds frame off the character, so this shot was aimed at `bone_1` |

Bind pose is still not a verified idle. After a clip has played, Bind pose now resets the animation before it stops. Before that fix, Stop left the skeleton at the last frame, so the character stayed hundreds of units away.

Looping `1330` returns `bone_1` from about Z 532 to Z 0. That pop is the root motion, which is still stored in the clip.

## Textures

`Material_00` through `Material_36` on the existing GLB receive `map.json`.

- `skin`, `cloth`, `face`, and `hair` also get `skin_n.png`, `cloth_n.png`, `face_n.png`, and `hair_n.png`.
- `weapon00` through `weapon04` are marked guessed in the page. Those PNGs have no `_n` sibling. `weapon_n.png` was not applied, because one normal cannot be assumed to match five albedo sheets.
- UV `invertY` is false. The face close-up is upright: scar, eye, and hair sit where they should. That checks orientation for this file. It does not prove every chart.
- Normals set `invertNormalMapY`. Babylon's PBR reader is DirectX-style, and these are the same PNGs the older viewer samples without a Y flip. The face and shirt are not inside-out under the scene light. That is a convention check, not the game's tangent frame.
- Hair uses alpha test 0.25, the same temporary cutoff as the older viewer.
- The Noesis `Zoro_1330` file has one material, `__GLTFLoader._default`. The map does not apply. Those exports stay untextured.

## Sword roles

Roles are inferred. Toggles used for the check are temporary. The older `preview/parts.json` labels disagree with the mouth-sword isolation, so those labels are not treated as original names.

| Mesh | Inferred role | Evidence | Confidence |
| --- | --- | --- | --- |
| 17 | One hand blade, stacked with 27 | Bind center matches 27 (about x -89, y 38, z 46). Longest axis about 145. Guessed sheet `weapon00`. No vertices in the bind head box | Medium |
| 27 | Duplicate of 17 | Same center within 0.1. Guessed sheet `weapon01` | Medium |
| 30, 33, 39 | The other hand, three copies | Shared bind center about x +89, y 38, z 46. Longest axis about 145. Sheets `weapon02`, `weapon03`, `weapon04` | Medium |
| 28, 31, 34, 37 | Hip scabbards | Longest axis 104–113. Bind center about x 16–21, y -20 to -32, z -42 to -39. They stay near the body through `1330` | Medium |
| 36 | Blade across the mouth in the bind pose | Shown alone, it is one horizontal blade in that place. 160 skinned vertices fall in the bind head box. Longest axis about 150. `Material_33` is mapped to `cloth`, so this sheet is not a weapon assignment. During `1330` the center leaves that head box | Medium for the bind-pose role. Low for the texture |
| 3 | Not a visible sword | Longest axis 7.5. World travel 0 through `1330`. `parts.json` calls it an eyes/mouth physics copy and leaves it off | Medium |
| 22, 23, 24 | Not visible swords | Longest axis 4.3. World travel 0 through `1330`. `parts.json` calls them spare physics copies and leaves them off | Medium |

Nothing in this table was turned off by default.

## Not done

- `names.json` has 115 names. None is an idle, hit, damage, guard, wait, or stand. No likely battle-idle or hit-reaction was exported or played. `Zoro_0000` is still unnamed and was not treated as idle.
- Asura `1322` and `1324` were not put on separate bodies. That waits until an idle or hit clip is actually playing.
- Noesis files still have no textures.
