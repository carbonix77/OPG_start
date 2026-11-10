# Zoro asset inventory

Inspected 10 November 2026. The files now sit in this working tree under `Zoro\`, `preview\`, and the matching Luffy and Sanji folders. Sizes are bytes on disk. Nothing was taken from the live game folder during this pass. These binaries are local only. `.gitignore` excludes them from the public repository.

The labels below match the project rule: verified, likely but unverified, unsupported, blocked, or unknown. "Reconstructed" means we built it and it is not an original extraction.

Classes used below:

- **Verified original** — file copied out of the game archives, header matches the format named.
- **Decoded original** — pixels or buffers produced from a verified original, not hand-painted.
- **Reconstructed** — our interpretation: a JSON schedule, a guessed material slot, a browser clip, or a particle approximation.
- **Missing** — not in the project.
- **Unsupported** — present as bytes, no complete reader.

The current preview is Three.js (`viewer.html`, `viewer.js`). There is no Babylon.js application yet.

## Model

| File | Format | Size | Purpose | Status | Confidence |
|---|---|---|---|---|---|
| `Zoro/model/MPLC001_Zoro.g1m` | G1M (`GM1G` sections, version bytes `4400`) | 1,679,956 | Zoro body, hair, outfit, and sword meshes in one skinned model | Verified original | High. Header was parsed in this project |
| `Zoro/model/MPLC001_Zoro.mtl` | Sidecar | 292 | Material-side records. ResHax notes on the same family treat `.mtl` as hash/index data, not a readable shader | Unsupported | Medium |
| `Zoro/model/MPLC001_Zoro.oid` | Sidecar | 2,260 | Object ids | Unsupported | Low |
| `Zoro/model/MPLC001_Zoro.oidex` | Sidecar | 972 | Object-id extension | Unsupported | Low |
| `Zoro/model/MPLC001_Zoro.ktid` | Sidecar | 424 | KT id table | Unsupported | Low |
| `Zoro/model/MPLC001_Zoro.grp` | Sidecar | 992 | Group table | Unsupported | Low |
| `Zoro/model/MPLC001_Zoro.extra` | Sidecar | 748 | Extra chunk | Unsupported | Low |
| `preview/zoro.glb` | glTF binary | 8,758,012 | Browser mesh with skinning, built from the G1M | Reconstructed | High that it comes from this G1M. Medium that every material and cloth piece matches the game |

Swords are submeshes of `MPLC001_Zoro.g1m`, not separate models. `preview/parts.json` labels right-hand, left-hand, and scabbard meshes. Several of those meshes are visible at once, so the preview shows stacked blades. There is no separate mouth-sword file. A mouth sword, if present, is one of those submeshes.

No original KTGL shader, outline shader, or toon ramp was extracted. The preview shades with a Three.js toon material.

## Textures

56 G1T files in `Zoro/textures/`. Twelve materials (bandage, bandana, cloth_part, faceparts, face, hair, skin, weapon00–weapon04). Each has:

| Suffix | Role | Status |
|---|---|---|
| `kidsalb` | Albedo | Verified original G1T. 12 files |
| `kidsnmh` | Normal | Verified original G1T. 12 files |
| `kidsocc` | Occlusion | Verified original G1T. Not decoded into the preview |
| `kidsrfr` | Reflectance / roughness-style map | Verified original G1T. Not decoded into the preview |
| `kidsair`, `kidss4m`, `kidssdm`, `kidsthk` | Face and skin only. Extra masks | Verified original. Not decoded |

Decoded PNGs in `preview/textures/zoro/` are albedo and normal for cloth, face, hair, skin, plus `weapon.png` and `weapon00.png`–`weapon04.png`. Those PNGs are decoded originals. `map.json` assigns body materials by a bounds guess and assigns sword materials `17, 24, 25, 27, 28, 30, 31, 34, 36` to `weapon00`–`weapon04` by eye. That assignment is reconstructed. The game's material-to-texture index was not recovered, so a blade can still wear another sword's sheet.

UV orientation in the preview is `flipY = false`. That matches the G1T layout we decoded. It has not been checked against a 3DMigoto frame.

## Skeleton and animation

211 G1A files in `Zoro/spells/`, 19,267,800 bytes total. Magic is the game's G1A container. These are verified originals.

Naming evidence is `preview/zoro-anims/names.json`, built from the game's move list and effect names. Relevant clips:

| Clip file | Name in `names.json` | Prototype role |
|---|---|---|
| `Zoro_0000.g1a` and nearby low numbers | Numeric ids. The preview also has a separate rest pose | Idle candidate. Not yet proven to be the battle idle |
| `Zoro_0500.g1a` | Normal attack 1 | Basic-attack candidate |
| `Zoro_0650.g1a` | Onigiri. Proof in `names.json` is combo order (`NNCC`), not an effect name | First Oni Giri candidate. Not effect-confirmed |
| `Zoro_1330.g1a` | Charming Demon Sleepless Night Onigiri. Effect name 艶美魔夜不眠鬼斬り | Effect-confirmed Onigiri special |
| `Zoro_NewWorld_1320.g1a` | Three-Sword Style Purgatory Onigiri. Combo-order proof. Its slash is filed under a different effect name (魔九閃) | New World Onigiri candidate |
| `Zoro_1320.g1a`, `Zoro_1322.g1a`, `Zoro_1324.g1a` | Demon Aura Nine-Sword Style Asura: Silver Mist | Asura candidate, base moveset, plus two phantom clips |
| `Zoro_NewWorld_0540.g1a` and `0541`, `0542` | Asura: Silver Mist | New World Asura, plus two phantom clips |
| `Zoro_*_camera.g1a` | Present for 1300, 1310, 1320, 1330 | Camera clips. Not converted |

No clip has been labeled as the hit reaction. That animation is missing from the name map, not necessarily missing from the 211 files.

`preview/zoro-anims/*.bin` are reconstructed clip buffers for the Three.js viewer. They are not glTF `AnimationGroup`s. Root motion has not been separated from the body motion.

Project G1M's own notes say cloth meshes stay in the bind pose because the game simulates them. This project's viewer parents loose meshes to the nearest bone. That is a reconstruction, and it is why some cloth and extra sword copies do not hang the way they do in game.

## Effects

| Asset | Status |
|---|---|
| `preview/zoro-anims/effects.json` | Reconstructed schedule: frame, bone, position, rotation, scale, effect id. Built from the game's action events and shot table. The shot row's flight numbers were empty until three attacks were patched from bullet table `0059` |
| `preview/effects/scenes.json` | Reconstructed index of 71 effect ids to a sprite name, a coarse kind, and colors |
| `preview/effects/*.png` | 147 decoded effect sprites. Decoded original pixels. The G1T sources are not stored in the project tree |
| `preview/effects/emitters/*.json` | Reconstructed. Color and some UV insets are read from G1FX. Rate, velocity, size, and ribbon-versus-card are filled from the filename |
| `preview/effects/g1fx-trees/*.tree.json` | Structural dump of three G1FX files. The container parse for `360POND` matches the public ResHax layout. The G1FX bytes themselves are not kept in the project |
| G1FX particle program | Unsupported. No public tool plays KTGL G1FX. Distortion, soft particles, and the shaped phoenix ribbon are not recovered |
| Shader / material blobs for effects | Missing |

Effect ids already tied to Zoro attacks include `CE1_0101_ZOR_SISI_SLASH`, `CE1_0101_ZOR_32POND`, `CE1_0101_ZOR_108POND`, `CE1_0101_ZOR_360POND`, `CE1_0101_ZOR_NWPOND`, `CE1_0101_ZOR_TATUMAKI`, `CE1_0101_ZOR_RASHOMON`, and `CE1_0010_TRC_HALF_LOCUS` (sword trail). Those names are verified against the game's effect labels. Their motion in the preview is not the original particle program.

## What is not here

- Original shader source and the game's toon ramp.
- A proven material-to-`weapon0N` index.
- A single visible sword set (right, left, mouth) with the other copies hidden.
- Hit-reaction clip id.
- G1FX files stored in the repo.
- Effect meshes.
- Babylon.js scene, React app, or cinematic camera.
- Side-by-side screenshots against the retail game. The Three.js preview has been screenshotted, and that is not a validation report.

## Dependencies still open

The G1M references texture ids. We have the G1T files and not the id-to-filename table, so sword materials are assigned by hand. G1A clips need the G1M skeleton; both are present. Effect sprites need the G1FX files to know draw order and curves; the sprites exist and the curves do not.
