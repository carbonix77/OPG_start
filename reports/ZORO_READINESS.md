# Zoro readiness

This pass closes the correctness gaps from the provisional cinematic. It does not accept the character as a visual match and it does not choose a canonical model. Effects stay off in inspection. The Cinematic preset is the only control that turns them on. Show all stays the sword default. The mouth crop stays a labeled stand-in.

## Working prototype

The inspector plays `Zoro_0000` and `Zoro_1330` on the Noesis file. The cinematic camera, bone trails, short tip streak, particle burst, and strike slowdown still come from the character config. Clip keys are not edited. The 0.28 s blend and the slowdown do not remove the stored root reset.

`previewForAsset` is now a registry. `noesis-present` gets the Zoro config. `fixture` gets a generated config with no mouth mesh and no cinematic. Any other id, including the existing GLB, gets null. A check returned present `zoro`, fixture `fixture`, unknown `true`, and fixture mouth `null`. The generated trail fixture still moved 3 units and used no character name.

Switching to the existing GLB left clips `1300`, `1310`, `1320`, and `1330`. Switching back left only `Zoro_0000` and `Zoro_1330`. Effects off still starts the camera pass. Orbit held a manual alpha, and the timeline restored the key.

## Verified visual match

The trail anchor is one skinned vertex on the named mesh, the vertex farthest along the configured offset axis. It is measured once and then reused, because these weapon meshes stay rigid on their bone. At normalized 0.08, 0.12, 0.22, and 0.35 the mouth anchor stayed at local `[124, 0.6, -10.1]` and the hand anchor stayed at `[9.9, 6.3, -0.8]`. Each point was 0 units from a real vertex of mesh 36 or mesh 39.

`reports/screenshots/zoro-accept-swing.png` is the previous 0.80 s frame. It has a pale arc above the weapon and a bright speck at the lower right. `reports/screenshots/zoro-ready-swing.png` is the same time after this pass. The arc and the speck are gone. The ribbon head sits on the horizontal blade. A pixel read of the lower-right of that frame found no bright speck.

`reports/screenshots/zoro-accept-strike.png` is the previous 2.32 s streak. `reports/screenshots/zoro-ready-strike.png` is the same time after this pass. The streak still sits on the tip of the horizontal blade.

This is still a preview stand-in. It is not an OPPW4 effect and it is not a verified match to the game.

## Remaining blockers

- The attack root local Z still ends near 533 and the idle starts near 0. Recenter hides the world jump. It does not change the clip.
- Sword materials are still the reconstructed sheet assignment. Mesh 36 UVs cover most of the sheet, so no new mouth texture was applied. The crop remains the labeled stand-in.
- Overlapping sword shells stay visible. No hide rule was guessed.
- `Zoro_0000` is still a provisional in-place combat stance, not a verified idle. `Zoro_0001` samples the same motion.
- No hit reaction was verified. `Zoro_0060` and `Zoro_0061` stay possible reactions only. This file does not contain them, and they were not relabeled.
- `Zoro_1330` stays Special 1, Charming Demon Sleepless Night Onigiri. It was not relabeled as a basic attack. `Zoro_0650` stays the combo-order Onigiri and is not in this sequence.
- Asura phantom bodies for `Zoro_1322` and `Zoro_1324` are not set up.
- No canonical runtime model is chosen.
- The public video was not committed. A reviewer cannot watch it from the repo.

## Recording

`Save cinematic recording` asks the browser to download a WebM and posts the same blob to the dev server. The server writes only `private-assets/review/cinematic-preview.webm`. That directory is gitignored.

The saved file is 1,604,241 bytes, `video/webm;codecs=vp8`, 1600×949, no audio track. A video element played it from the start and reached the end at 7.20 s. The capture was requested at 30 fps. The first metadata read reported an infinite duration, which is a MediaRecorder container quirk. After the element played through, the duration was 7.199 s. This file is local only. It is not a reviewed video.

## Playback

`measureCinematic` with recenter, stage, textures, effects, the stand-in crop, and show all:

- 432 frames in 7.29 s
- 59.3 fps counted, engine fps 60
- minimum counted rate 13.0 fps on one frame, while the tip vertex is measured
- 95th percentile frame gap 17.2 ms
- root world Z minimum and maximum were both 0
- root local Z was -3.65, then 532.89, then idle -0.04
- largest camera step: alpha 0.01 at `Zoro_1330` normalized 0.99, beta 0.01, radius 4.93, target 3.1
- mouth trail was active from normalized 0.01 to 0.39, hand trail from 0.02 to 0.35, streak from 0.33 to 0.36, burst from 0.33 to 0.35
- hand, mouth, and hip groups stayed visible

With recenter off, world Z goes from 532.93 to -0.04. With recenter on, world Z is 0 at both samples. Local Z is unchanged.

`npm run build` completed. The main chunk is about 6.57 MB and the build printed the existing chunk-size warning.
