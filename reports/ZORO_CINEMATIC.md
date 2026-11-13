# Zoro cinematic preview

The cinematic path plays `Zoro_1330` on the Noesis skeleton, eases the camera through keys in `previewConfig.ts`, then blends into `Zoro_0000`. Orbit stays available as a debug switch. Preview slash, flash, and streak are stand-ins. They are not OPPW4 effects. The mouth crop stays off unless its checkbox is on. Show all is still the default sword view. The cinematic button hides only the tiny world-static meshes, same as the other preview buttons.

`InspectorScene` does not name Zoro, a clip, or a mesh index. A second character adds a `PreviewConfig` and returns it from `previewForAsset`. Camera keys, effect markers, clip names, and mesh groups stay in that object. A config with `cinematic: null` gives the button nothing to play.

## Camera

Keys aim a little above the follow node and change radius so the swords stay inside the 16:9 frame. The radius is 377 at the start, 327 at 0.53 s, 349 at 0.80 s, 315 at 1.46 s, 320 at 2.32 s, 297 at 3.65 s, 434 at 4.98 s, 338 at 6.10 s, and 458 at 6.63 s. After the attack, it eases to the idle hold at radius 460. The wider moments are the ones where a sword sticks out. Alpha and beta drift across the attack instead of cutting.

During playback the follow node's world matrix is updated after recenter, before the camera reads it. That keeps the camera on the recentered body when the stored root Z changes. The clip keys are not edited. Root local Z still runs from about -3.65 to 532.93, then the idle clip starts at -0.04. World Z stayed 0 for the measured playback. The largest single-frame camera step was 0.03 radians of alpha, 0.02 of beta, 13.2 of radius, and 3.6 units of target. That is the moving camera, not a cut.

## Effects and the mouth blade

The effects turn on only while their marker is inside the attack:

| Effect | Normalized time | What it is |
| --- | --- | --- |
| release-streak | 0.05–0.10 | Short pale bar near the head |
| slash-arc | 0.14–0.39 | Crescent across the raised swords |
| strike-flash | 0.33–0.36 | Small bright ball on the mouth-blade bone |

The checkbox says they are stand-ins, not an OPPW4 effect. Turning it off removes them.

The mouth mesh keeps the cloth baseline unless "Preview blade crop" is checked. That label says it is not an original texture. The cinematic button follows the checkbox. It does not change mesh UVs or `map.json`. The frames in this report were taken with the crop on, and the panel text says so.

Hand, mouth, and hip groups stayed visible for all 420 measured frames. Nothing in this pass hides them.

## Playback

`measureCinematic` on the loaded Noesis file, with recenter, stage, textures, effects, and the stand-in crop:

- 420 frames in 7.27 s
- 57.8 fps counted, engine fps 60
- no `console.error` calls
- root world Z minimum and maximum were both 0
- root local Z was -3.65 at the attack start, 532.93 at the attack end, and -0.04 at the idle start
- orbit debug held a manual alpha, and turning the timeline back on restored the key

The 0.28 s blend still does not remove the stored root reset. Recenter is what keeps the view from jumping.

## Frames

`reports/screenshots/zoro-cine-contact.jpg` is the attack at 0.00, 0.53, 0.80, 1.46, 2.32, 3.65, 4.98, 6.10, and 6.63 seconds, then idle at 0.00.

`reports/screenshots/zoro-cine-strike.jpg` is the 2.32 s frame at full 16:9.

`reports/screenshots/zoro-cine-ui.png` shows the cinematic note, the stand-in crop label, and the effect label.

## Still open

The crop is not the original mouth-sword texture. The effects are not the game's effects. `Zoro_0000` is still a provisional idle. The root key still resets. No canonical model is chosen. Asura is not instanced.
