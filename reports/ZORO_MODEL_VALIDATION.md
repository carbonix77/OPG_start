# Zoro model validation

Date: 10 November 2026. This follows the review on issue #3 and the owner's approval to install Noesis64 and Project G1M locally.

The game directory was not modified. Neither OPPW4 mod loader was installed. `preview/zoro.glb` was not replaced. Exported comparison files stayed under `private-assets/`, which Git ignores.

## Tools

| Item | Label | Source |
|---|---|---|
| Noesis 4.474, file `noesisv4474.zip` | Verified download from the author's file mirror. No checksum is published on that page | [Noesis project page](https://www.richwhitehouse.com/index.php?content=inc_projects.php&project=noesis), file `https://www.richwhitehouse.com/filemirror/noesisv4474.zip` |
| Noesis zip SHA-256 | `4A2F8F47ABA7C6C277E7A197B6386A997D579E1BB29C332E995DBA58CC8C3846` | Computed here |
| `Noesis64.exe` SHA-256 | `6CEF6028AD734D6E76E92F82485257FC76AD8E06D3F463B5621CE572E2A07652` | Computed here. Authenticode status: NotSigned. File version resource says 1.0.0.1 |
| Project G1M v1.8.2 | Verified. Zip SHA-256 matches the GitHub release digest | [v1.8.2](https://github.com/Joschuka/Project-G1M/releases/tag/v1.8.2), digest `11af18a2871fdc3e55c36ce0500041f4a826d73a231e438d31118b078e5ea354` |
| 64-bit `ProjectG1M.dll` SHA-256 | `AF288A237A9219BE56175EBB46EC67D209757E3D7B1B5990BF4C81C76B80907C` | From that zip. Not signed |
| 32-bit `ProjectG1M.dll` SHA-256 | `F84FB90B2580DAB2E1059D472056A8EEDC1EBEE46C2A77C925CD00B09A358E98` | Installed beside it so Noesis64 and Noesis.exe both see the plugin. Not used for the export |
| hearhellacopters Project G1M v1.9.2.4 | Not installed | [v1.9.2.4](https://github.com/hearhellacopters/Project-G1M/releases/tag/v1.9.2.4). Its notes are about Nioh 3 textures. A user reported that builds 1.9.0 through 1.9.2 did not load in Noesis ([issue 42](https://github.com/Joschuka/Project-G1M/issues/42)). v1.9.2.4 itself was not tested |

Windows Defender's command-line scan returned `0x80004005` with `Product/Feature disabled`, so this machine did not scan the zip files. The plugin zip matches the published digest. The Noesis zip has no published digest; it was taken from the author's file mirror.

## Model comparison

Command that produced the comparison glTF:

`Noesis64.exe ?cmode MPLC001_Zoro.g1m zoro-noesis.gltf`

| Measure | Noesis glTF | Existing `preview/zoro.glb` | Label |
|---|---|---|---|
| Meshes | 40 | 40 | Verified match |
| Vertices | 32,159 | 32,159 | Verified match |
| Nodes | 206 | 206 | Verified match |
| Nodes named `bone_*` | 166 | 166 | Verified match |
| Bone parent links | 0 mismatches across 166 bones | same | Verified match |
| Skin joints | 1 skin, 139 joints | 36 skins, 131 unique joints | Close. The sets share 131 names |
| Materials | 0 | 37, and 0 embedded images | Expected. This export did not load G1T files |
| Animations | 0 | 4, named 1300, 1310, 1320, 1330 | The old GLB has clips. This Noesis export does not |

Joints present in the Noesis skin and absent from the old GLB skins: `bone_0`, `bone_639`, `bone_640`, `bone_641`, `bone_642`, `bone_643`, `bone_644`, `bone_645`.

The glTF positions are already Y-up. The tall body mesh extends in Y, and the wide arm mesh extends in X. No extra axis conversion was applied after export.

`preview/zoro.glb` SHA-256 `2b207289560e49e18643a8146f8dfab3d6c24337b9bcc624ca5b2db8428b3381`. It was left in place.

Source model SHA-256 `648752738ac0890e96316cdfe840f652421de096e42a0bd2ec0b1a7edc7431d2`, 1,679,956 bytes.

## Swords

Noesis names the parts `model_0_submesh_N`. It does not name swords. The placements below are inferred from bind-pose bounding boxes, then compared with the labels already in `preview/parts.json`. That is not an original material assignment.

| Meshes | Bind-pose center, approximate | Longest axis | `parts.json` label | Visible by default |
|---|---|---|---|---|
| 17 and 27 | x +89, y 148, z +46 | 145 | Sword in the right hand, two copies | Yes, both |
| 30, 33, and 39 | x -89, y 148, z +46 | 145 | Sword in the left hand, three copies | Yes, all three |
| 28, 31, 37 | x -16, y 90, z -41 | 113 | Left scabbard copies | Yes |
| 34 | x -21, y 78, z -39 | 104 | Left scabbard | Yes |
| 22, 23, 24 | thin slivers, longest axis 4 | 4 | Spare sword physics copies | No |

Two hand positions and one hip cluster are visible. Several copies occupy the same center, which is the stacked-sword problem. No long mesh sits on the head in the bind pose, so a mouth sword was not identified as its own mesh. One of the hand copies may move to the mouth during a clip. That was not played, so no mesh was hidden.

Material-to-`weapon00`–`weapon04` binding is still unknown. The Noesis file has no materials because `-g1texture` accepts one G1T, and this model uses many.

## Clip matrix

Playback was not verified. Noesis did not write a G1A clip into glTF. Labels come from `preview/zoro-anims/names.json` unless noted.

| Slot | File | SHA-256 | Bytes | Label status |
|---|---|---|---|---|
| Idle | Not identified. `Zoro_0000.g1a` is only an unnamed candidate | `95cd11c20c98b0a78bd6b79bd63c5499bc1606e3c0f59e61cf79fa10ae57077e` | 20,204 | Unknown. Much smaller than the attack clips. Not played |
| Basic attack | `Zoro_0500.g1a`, Normal attack 1 | `a2f4eabf19134e5d6570b43d4096fbfb5b8b049544e17573e8695aa546f777aa` | 96,868 | Likely. Combo-order proof, not an effect name. Not played |
| Special 1 | `Zoro_1330.g1a`, Charming Demon Sleepless Night Onigiri | `0a309785f5f66f2b06b35a428dac270c971e587a876cbeca8c2ab5dc395ac7b7` | 227,660 | Selected for the prototype. Effect name is in the game data. The old GLB contains a clip named 1330 with 242 channels. This pass did not play it |
| Special 1, kept aside | `Zoro_0650.g1a`, Onigiri | `473649640c84d1dd337fbfce337837add24afae38783188d4b5b5b222e361561` | 116,472 | Combo-order candidate. Not discarded |
| Special 2 | `Zoro_1320.g1a`, Asura: Silver Mist | `d0a15c5b050c6e20a1729fda66701dff682c935845b8a490e046c8a986b554fb` | 173,284 | Effect-confirmed name. Old GLB clip 1320 has 270 channels. Not played |
| Special 2 phantoms | `Zoro_1322.g1a`, `Zoro_1324.g1a` | `1c3f2f3c6756b55b28b810636a683b4e920b9576938c55d0a46455fdba967785`, `3544a6b6cae0d466a096b7f602052af9cd5243413c21666ce02ab4ea66d18bf2` | 123,768 and 116,544 | Separate bodies. Not in the old GLB. Not played together |
| Hit | No named file among 115 named clips |  |  | Unknown. 92 G1A files have no move name. No substitute was chosen |

## How a G1A clip has to reach Babylon

1. Put the G1M, the `.oid`, and the chosen G1A files in one folder.
2. In Noesis, use Tools, Project G1M, **Merge all assets in the same folder**. The plugin text says this merges G1M, G1T, oid, and G1A/G2A.
3. Export glTF. Babylon.js `AnimationGroup` can play that file if the skin joint order matches the clip.

What was actually tried:

- `?cmode` on the G1M writes the mesh and the 166-bone skeleton. It writes no animation.
- `-loadanim Zoro_1330.g1a` produced an FBX the same size as the mesh-only FBX.
- Leaving `Zoro_1330.g1a` beside a copy of the G1M still exported 0 animations.
- `?runtool "Merge all assets in the same folder"` exited without writing a clip.

So the merge step is still a GUI action. It was not completed.

What can fail after that, from the plugin strings and this comparison:

- Cloth and SOFT nodes. The plugin can load SOFT nodes. It does not simulate cloth, so those meshes stay in the bind pose unless a clip moves their bones.
- Additive clips. The plugin has an "Additive animations" switch. Which Zoro clips use it is unknown.
- Split skins. The old GLB's 36 skins omit eight joints that Noesis keeps. A Babylon file should use the single Noesis skin.
- Root motion. It was not separated. It may be baked into `bone_0` or another root.
- One `-g1texture` path cannot attach all 56 G1T files. Materials stay empty until that link is solved.
- Facial shapes are not part of this export.

## Screenshots

Not captured. The Babylon viewer does not exist yet, and the Noesis merge is still a GUI step. Existing Three.js images would not satisfy the review.

When the model is in Babylon, capture front, left, right, back, and three-quarter views with one camera distance, one field of view, and one light rig. Save them under `reports/screenshots/`. That directory is gitignored. Do not commit the images.

## Still blocked

- G1A playback and a glTF animation export.
- Which unnamed clip is idle, and which is the hit reaction.
- Which duplicate sword meshes to hide, including whether a mouth sword is one of the hand copies.
- Which `weapon0N` texture belongs to which material.
- A Defender scan, because that component is disabled on this machine.
