# Extraction plan

Date: 10 November 2026. This is the plan for recovering Zoro. It does not start the Babylon.js app. The model is not validated with front, side, and back shots yet, so effect work stays behind that.

## Labels

| Step | Label |
|---|---|
| Local G1M, G1T, and G1A copies exist for Zoro | Verified, by file header and size on this machine |
| Cethleann 1.2.0 plus Noesis64 and Project G1M can read OPPW4 G1M/G1T/G1A | Likely but unverified here. The plugin author reported that path on 9 May 2026. It was not re-run in this pass |
| G1FX has a public player | Unsupported |
| 3DMigoto v0.5 is required to obtain the mesh or the clips | Unsupported. The files are already local |
| Installing either mod loader into the game directory | Blocked until you approve it |
| Which `weapon0N` sheet belongs to which material | Unknown |
| `Zoro_0000.g1a` is the battle idle | Unknown |
| A hit-reaction clip id | Unknown |

## What is already true

The project already holds Zoro's original model, textures, and 211 animation files. A Three.js preview plays the mesh and the clips. That preview is a conversion, not the prototype this brief asks for.

Formats in these files, confirmed on disk or by the tool authors:

| Format | Role | Tool that reads it |
|---|---|---|
| RDB / LINKDATA under the game's `AssetRelease\Retail` | Archive | Cethleann 1.2.0 `DataExporter --rdb -g OnePiece4` |
| G1M | Skinned model | Noesis 64-bit with the Project G1M plugin |
| G1T | Textures, including BC compressed albedos | Same plugin, and the decoder already used in this project for PNG export |
| G1A | Skeletal animation | Same plugin. Put the G1A beside the G1M and use Tools, Project G1M, Merge all assets in the same folder |
| G1FX (`XF1G`) | Effect container | No public player. This project walks the chunk headers only |
| `.mtl`, `.oid`, `.ktid`, `.grp` | Small sidecars | No established decoder found. Treat as indexes |

Sources for the tool path:

- Cethleann 1.2.0, 10 June 2022: <https://github.com/neptuwunium/Cethleann/releases/tag/1.2.0>. The release note says named tags are gone and the command form is `--rdb`. It asks for the .NET 7 runtime.
- Project G1M author, 9 May 2026, on a broken OPPW4 extract: use Cethleann 1.2.0 and `Cethleann.DataExporter --rdb -g OnePiece4 <out> <game\File\CMN\AssetRelease\Retail>`, then open the result in `Noesis64.exe`. Issue: <https://github.com/Joschuka/Project-G1M/issues/59>
- The same thread records that `Noesis.exe` (32-bit) crashes on these files and `Noesis64.exe` opens them.
- Project G1M is archived. The README points at a fork by Copter and does not link it. The archived plugin is the one the May 2026 report used successfully. Confirm the DLL loads before relying on a fork.
- Project G1M's earlier write-up says most G1A clips export, cloth stays in the bind pose because the game simulates it, and some facial clips (`EVFace`) do not apply correctly.

Do not write a new G1M or G1A parser. The GLB already in `preview/zoro.glb` can be re-exported from Noesis if joint order or cloth differs.

The 3DMigoto loader (Nexus mod 2, v0.5) is optional and only for a frame dump of one attack. It does not replace Cethleann. See `OPPW4_MOD_LOADER_RESEARCH.md`. Do not install it until that dump is actually needed.

## Phase A — confirm the original model in Noesis

Work from copies. The copies are already `Zoro/model` and `Zoro/textures`.

1. Install Noesis 64-bit and the Project G1M plugin. No game files change.
2. Open `MPLC001_Zoro.g1m` with the G1T files available to the plugin.
3. Export one GLB (or FBX, then GLB) and compare it with `preview/zoro.glb`: vertex count, bone count, which submeshes are swords.
4. Record the material index that lands on each `weapon0N` albedo. Replace the hand assignment in `preview/textures/zoro/map.json` only after that index is visible.
5. Stop. Capture front, left, right, back, and three-quarter screenshots before any new effect work. That is the gate in the brief. Those shots are not taken yet.

If Noesis and the current GLB disagree, the Noesis mesh is the reference and the current GLB is the thing to fix.

## Phase B — five clips, still original data

Export these G1A files beside the G1M, then to glTF animation clips. Do not invent a clip if Noesis will not export it.

| Slot | File to try first | If it is the wrong move |
|---|---|---|
| Idle | `Zoro_0000.g1a`, then the next low-numbered stance clips | Say which file looped as a stance. Do not label a T-pose as idle |
| Basic attack | `Zoro_0500.g1a` (Normal attack 1) | `Zoro_0510.g1a` is Normal attack 2 |
| Special 1, Oni Giri | `Zoro_0650.g1a` (Onigiri) | `Zoro_1330.g1a` or `Zoro_NewWorld_1320.g1a` if 0650 is only a combo step |
| Special 2, Asura | `Zoro_1320.g1a` with `Zoro_1322.g1a` and `Zoro_1324.g1a` (the two phantom bodies) | `Zoro_NewWorld_0540.g1a` plus `0541` and `0542` |
| Hit | Not identified | Search the unused G1A names for a damage reaction before substituting anything |

`Zoro_1320_camera.g1a` and `Zoro_1330_camera.g1a` are the first camera sources. Export them only after the body clips play on the same skeleton.

Cloth and extra sword copies: hide every part except one right-hand sword, one left-hand sword, one mouth sword, and the matching scabbards. `preview/parts.json` already has those labels. The brief says not to change default visibility until the parts are named. They are named. Hiding the spare copies is the sword-attachment task, and it waits until the screenshot gate.

## Phase C — effects, after the model gate

Order:

1. Keep the schedule in `preview/zoro-anims/effects.json` for the five clips. It already has frame, bone, and the effect id.
2. For shot-driven moves, copy life, scale, and the flight numbers from bullet table `0059`. That is done for 360 Pound Phoenix (bullet 2600), Lion's Song (bullet 602542), and Dragon Twister (bullet 602657). The axis of the flight number is still unlabeled.
3. Sword trails use `CE1_0010_TRC_HALF_LOCUS` and the blade tips. That trail is a reconstruction.
4. Do not draw a new phoenix ribbon until a 3DMigoto frame dump or a G1FX mesh is in hand. The current cards are a reconstruction and must stay labeled as one.
5. A frame dump is the only reason to install the Nexus v0.5 loader. Ask before installing it into the game directory.

G1FX rate, size curves, blend mode, and the shaped slash mesh stay unsupported. Color and some UV rectangles are recovered.

## What we will not do in the next step

- Build the React / Babylon.js app.
- Install either mod loader.
- Replace the Three.js preview until the Noesis mesh is compared.
- Invent a hit reaction, a toon ramp, or a phoenix mesh.
- Treat `preview/zoro.glb` or the emitter JSON as original files.

## Uncertainties

- Whether Project G1M's archived DLL still loads on this PC, or whether Copter's fork is required.
- Whether `Zoro_0000.g1a` is the battle idle.
- Which submesh is the mouth sword.
- Whether bullet field 22 is distance, speed, or a hit length. It is stable across 32, 72, and 108 Pound Phoenix (value 160) and smaller on Lion's Song (50) and Dragon Twister (10).
- Whether the Legendary Edition build still accepts the 2021 3DMigoto loader. Not tested.
