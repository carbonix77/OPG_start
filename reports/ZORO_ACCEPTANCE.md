# Zoro preview acceptance

This pass keeps the approved cinematic treatment and tightens it. Trails are slimmer, smoothed, and placed on a measured mesh bound instead of a fixed bone offset. The strike glow is a short streak along that tip, with a small particle burst. Effects and the mouth crop still turn on only from the Cinematic preset. Show all stays the sword default. Orbit stays a debug switch. No canonical model is chosen.

The scene class still does not name Zoro. Bone names, mesh indices, clip names, camera keys, and effect times stay in the character config. A generated box with no character name drove the same trail path and moved 3 units.

## Before and after

`reports/screenshots/zoro-cine-strike.jpg` is the old thick arc and round flash at 2.32 s. `reports/screenshots/zoro-trail-strike.png` is the later pale ribbon and round glow.

`reports/screenshots/zoro-accept-strike.png` is the same 2.32 s frame after this pass. The glow is a short streak at the blade tip. The round flash is gone.

`reports/screenshots/zoro-accept-swing.png` is 0.80 s. The ribbon is a smooth curve along the raised sword. It is still a preview stand-in.

`reports/screenshots/zoro-accept-contact.jpg` is the attack at 0.00, 0.53, 0.80, 1.46, 2.32, 3.65, 4.98, 6.10, and 6.63 seconds, then idle at 0.00.

Across those ten stills, 8 of 3280 mesh-bound corners fell just outside the frame. The raised blades in the saved frames stay readable. The stage fog is a light depth cue from the config. It is not a game effect.

## Recording

MediaRecorder produced a 1,551,162 byte `video/webm;codecs=vp8` from the canvas during the measured playback. The stream is the 16:9 view at 30 fps capture. It has no audio track. The blob stayed in the browser session. It was not written to disk and it is not in this repo. The owner allowed public development screenshots and did not grant public video of the captured model. The stills above are the saved record.

## Playback

`measureCinematic` with recenter, stage, textures, effects, the stand-in crop, and show all:

- 436 frames in 7.27 s
- 60.0 fps counted, engine fps 60
- minimum counted rate 41.5 fps
- 95th percentile frame gap 17.3 ms
- no `console.error` calls
- root world Z minimum and maximum were both 0
- root local Z was -3.65, then 532.88, then idle -0.04
- largest camera step: alpha 0.18, beta 0.11, radius 15.3, target 5.8
- hand, mouth, and hip groups stayed visible

With recenter off, world Z goes from 532.93 to -0.04. With recenter on, world Z is 0 at both samples. Local Z is unchanged. The blend and the strike slowdown do not remove that stored reset. Effects off still starts the camera pass. Orbit held a manual alpha, and the timeline restored the key. `npm run build` completed.

## Acceptance checklist

| Item | Current state |
| --- | --- |
| Model and skeleton | Noesis file with `SK_Skeleton`, clips `Zoro_0000` and `Zoro_1330`. Not the canonical model. The GLB stays a separate comparison. |
| Textures | Local `preview/textures/zoro`. Not committed. The assignment uses the matched GLB material slots. |
| Idle | `Zoro_0000` is a provisional in-place stance. It is not a verified idle. |
| Attack | `Zoro_1330` plays on that same skeleton, then blends back. Keys are not edited. |
| Swords | Show all is the default. Hand, mouth, and hip groups are recorded and left visible. Overlaps are not solved. |
| Mouth sword | Mesh 36 stays on the cloth sheet unless the crop checkbox is on. The crop is not an original texture. The mesh is skinned to a child of `SK_Head`. |
| Root | Recenter cancels world X and Z. The clip still stores a jump of about 533 on local Z. |
| Effects | Off until Cinematic or the checkbox. Trails, streak, burst, and the 0.1 s slowdown are preview stand-ins. |
| Camera | Timed keys. Orbit is the debug switch. |
| Open it | From `app/`, `npm install` then `npm run dev`. Open `http://localhost:5173/`. Choose "Noesis glTF provisional idle and 1330", then Cinematic. |

## What is reusable

The scene reads a `PreviewConfig`. A trail anchor can use a mesh index from that config, or the offset when the index is null. Camera keys, fog density, effect times, bone names, and the hit-stop live in the config. The generated-box test does not use a character name.

`previewForAsset` still returns the Zoro config for every id. A second character needs its own config object and a local model. That is not loaded here. Do not treat this as a second-character import.

## Still open

The mouth texture is still the cloth sheet or a labeled crop. Sword shells still overlap. `Zoro_0000` is still provisional. The effects are not OPPW4 effects. The root key still resets. No canonical model is chosen. Asura is not instanced. The preview is not finished while those stay open.
