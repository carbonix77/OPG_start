# Zoro blade trails

The thick arc, bar, and flash from the previous cinematic pass are replaced by short ribbons, a soft bloom, and a small particle burst. They follow bones named in the Zoro preview config. They are an original preview treatment, not an OPPW4 effect, and they stay off until the Cinematic preset or the effects checkbox is used. That preset also turns on the mouth-blade crop and says it is not an original texture. Show all stays the sword default. Orbit remains a debug switch. The camera keys are the same ones from the previous pass.

`InspectorScene` still does not name Zoro, a clip, or a mesh index. Bone names, shot times, effect markers, and the strike slowdown live in the character config. A generated box and clip, with no character name, drove the same trail path and moved 3 units.

## What the effects do

Each trail records the world position of an anchor parented to a configured bone. A still frame is primed from the previous 0.45 s of that bone, so the ribbon is the recent swing and not the whole clip. Playback keeps the latest samples. The ribbon faces the camera and tapers. The bloom is an additive sphere on the mouth-blade bone. The burst is eight small spheres on the same anchor. A strike slowdown sets the attack clip speed to 0.45 for 0.1 s at normalized time 0.34. It does not edit keys, and it runs only while effects are on.

| Effect | Normalized time | Bone | What it is |
| --- | --- | --- | --- |
| mouth-trail | 0.00–0.39 | `0x43b3b303` | Pale ribbon from the mouth-blade bone |
| hand-trail | 0.02–0.35 | `SK_R_Weapon` | Pale ribbon from the right weapon bone |
| strike-bloom | 0.33–0.35 | `0x43b3b303` | Soft additive glow |
| strike-burst | 0.33–0.37 | `0x43b3b303` | Eight small particles |

## Before and after

`reports/screenshots/zoro-cine-strike.jpg` is the previous 2.32 s frame: a thick blue arc and a bright circular flash.

`reports/screenshots/zoro-trail-strike.png` is the same moment with the new treatment: a soft glow on the mouth blade and a short recent trail. The detached arc is gone.

`reports/screenshots/zoro-trail-swing.png` is 0.80 s. The hand ribbon is a short crescent beside the swinging sword.

`reports/screenshots/zoro-trail-contact.jpg` is the attack at 0.00, 0.53, 0.80, 1.46, 2.32, 3.65, 4.98, 6.10, and 6.63 seconds, then idle at 0.00. The trail reads at 0.53 s and 0.80 s. The glow reads at 2.32 s. The character returns to the provisional idle.

MediaRecorder produced a 1,275,201 byte `video/webm;codecs=vp8` during the measured playback. That blob stayed in the browser session and was not copied into this repo, so these stills are the saved motion record. They are not a claim that a video file was reviewed.

## Playback

`measureCinematic` on the loaded Noesis file, with recenter, stage, textures, effects, the stand-in crop, and show all:

- 433 frames in 7.30 s
- 59.3 fps counted, engine fps 56.2
- one slow frame of about 76 ms, so the minimum counted rate is 13.1 fps
- 95th percentile frame gap 23 ms
- no `console.error` calls
- root world Z minimum and maximum were both 0
- root local Z was -3.65 at the attack start, 532.89 at the attack end, and -0.04 at the idle start
- largest camera step: alpha 0.01, beta 0.01, radius 7.24, target 2.83
- hand, mouth, and hip groups stayed visible on every measured frame
- attack `speedRatio` was 1 at 1.81 s, 0.45 at 2.31 s, and 1 at 2.50 s

With recenter off, world Z goes from 532.93 at the end of `Zoro_1330` to -0.04 at the start of `Zoro_0000`. With recenter on, world Z is 0 at both samples. Local Z is unchanged either way. The 0.28 s blend and the strike slowdown do not remove that stored reset.

Effects off still starts the same camera pass and says the effects are off. Orbit debug held a manual alpha, and turning the timeline back on restored the key. Switching to the existing GLB left only clips 1300, 1310, 1320, and 1330. Switching back left only `Zoro_0000` and `Zoro_1330`, and the cinematic started again. `npm run build` completed.

## Still open

The ribbons are short and pale. They are not a game slash. The crop is not the original mouth-sword texture. `Zoro_0000` is still a provisional idle. Sword groups are still unverified. The root key still resets. No canonical model is chosen. Asura is not instanced. Reuse is checked with a generated fixture, not a second extracted character.
