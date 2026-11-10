# OPPW4 mod loader research

Date of this note: 10 November 2026. Nothing was installed, and the game directory was not modified. No loader archive was downloaded, so these findings come from the published pages, not from running the tools.

## Labels

| Finding | Label |
|---|---|
| Nexus mod 2, v0.5, is HazzyDevil's 3DMigoto texture and mesh loader | Verified, from the Nexus page |
| Frame analysis can dump textures and vertex/index buffers for one frame | Verified, from the author's description |
| It extracts G1A clips, skeletons, or G1FX particle programs | Unsupported. The page does not claim this |
| v0.5 runs on this Legendary Edition install | Unknown. Not tested |
| HUD toggle is F4 | Likely but unverified. v0.4 text says F4. A later note says F6 |
| RenderDoc can inspect one frame of this build | Unknown. Not run, and the executable's graphics API was not confirmed |
| GameBanana tool 18163 is a separate RDB-injection loader | Verified, from that page |

The page at <https://www.nexusmods.com/onepiecepiratewarriors4/mods/2> is one tool. A later tool uses a similar name and does a different job. They are recorded separately below.

## Tool that matches the requested page

| Item | Evidence |
|---|---|
| Name | OPPW4 Mod Loader - 3Dmigoto |
| Version | 0.5 |
| Author | HazzyDevil |
| First upload | 25 February 2021 |
| Last update on Nexus | 4 May 2021 |
| Source | <https://www.nexusmods.com/onepiecepiratewarriors4/mods/2> |
| Basis | 3DMigoto, credited to DarkStarSword / ausgeek |
| Stated game | One Piece: Pirate Warriors 4 on Nexus. No version string, and no Legendary Edition note |

### Installation, as written by the author

Extract the archive into the game directory. Texture and mesh mods made for 3DMigoto go in the `Mods` folder that the archive creates. In game, F1 opens the help window.

Hunting is off in v0.5. The author says a modder sets `hunting=0` to `hunting=2` in `d3dx.ini`. The dump key itself is not published on the Nexus description. v0.4 says hotkeys were remapped and are listed in the F1 window. A Nexus comment mentions F8; that is a user report, not the author's key list.

### What v0.5 says it can do

The author states all of the following:

- Replace textures.
- Replace meshes.
- Run frame analysis that captures in-game textures and vertex/index buffers.
- Load those buffers in Blender with a Python add-on shipped alongside the loader.
- Dump textures tied to the shaders the pack knows about (the v0.5 fix).
- Hide the HUD. v0.4 text says F4. A later GameBanana note for the same line of work says F6. The F1 window is the authority, and it was not opened here.
- Use the game's own shaders from v0.2 onward, which is why the author describes less slowdown than the first build.

That is graphics-pipeline capture and replacement. A frame dump can show the mesh and the textures the GPU is using while Zoro attacks, including effect sprites and effect meshes that are actually drawn in that frame.

### What it does not claim

The Nexus text does not mention:

- Skeletal animation
- G1A files
- Bone weights beyond whatever is in a raw vertex buffer for one frame
- Particle system data, birth rates, or curves
- G1FX files
- Attack timelines
- The RDB or LINKDATA archives

A vertex buffer from one frame is a posed snapshot. It is not a skeleton animation.

Shader visibility is partial. v0.5 says textures for the shaders it knows are dumped. It does not say the original KTGL shader source, or the game's material constants, are exported as editable files.

### Supported game versions

Not stated beyond "OPPW4". Nexus comments from 2025 say the loader still runs on Steam for Windows when its files sit next to `OPPW4.exe`. Those are user reports. This machine's Legendary Edition install was not tested. Linux and Steam Deck comments describe extra DLL overrides. Those were not checked.

## The other loader

GameBanana tool 18163, "OPPW4 Mod Loader v2", is a different program.

- Author: vagonumero13, commissioned for this game.
- Method: replaces archive files in memory through `dinput8.dll`.
- Install: extract `OPPW_PATCHER.zip` into the game directory and put mods in `OPPW4_PATCHER`. Nested mod folders are not used. Removal is deleting `dinput8.dll` and `OPPW4_PATCHER`.
- The page says it can run beside the 3DMigoto loader, and that mods are not interchangeable.
- Source: <https://gamebanana.com/tools/18163>

The v2 page describes file replacement, not frame analysis. It is the wrong tool for capturing a drawn attack, and it was not installed.

## RenderDoc

3DMigoto is a Direct3D 11 interceptor. RenderDoc can capture a D3D11 frame: meshes, textures, shaders, and draw order for that instant. It does not recover the skeleton clip or the particle program. It was not run. Whether this Legendary Edition build is still D3D11 was not confirmed from the executable.

## What this means for Zoro

| Need | 3DMigoto v0.5 | v2 RDB patcher | Already in this project without either loader |
|---|---|---|---|
| Character mesh | Frame dump of the posed mesh, or a mesh-swap mod | Replace files if you already have replacements | `Zoro/model/MPLC001_Zoro.g1m` |
| Character textures | Frame dump of bound textures | Same limit | `Zoro/textures/*.g1t` |
| Sword mesh | Same posed dump. Swords are submeshes of the character, not a separate file | No | Inside the same G1M |
| Sword textures | Can appear in a frame dump | No | `weapon00`–`weapon04` G1T files |
| Shader resources | Shader list known to that 3DMigoto pack; not KTGL source | No | Not extracted |
| Effect textures and effect meshes drawn on screen | Yes, if they are in the dumped frame | No | Effect sprites decoded to `preview/effects/*.png`. Effect meshes are not extracted |
| Particle programs | No | No | G1FX container only. Emitter motion is incomplete |
| Skeletal animation | No | No | 211 `Zoro/spells/*.g1a` files |

## Risks

- Both loaders are installed into the game directory. That was not done.
- v0.5 is from 2021. Compatibility with the current Legendary Edition build is unverified.
- Frame analysis writes large dumps beside the game and slows the frame. Hunting must be turned on in `d3dx.ini` first.
- A dumped mesh is one pose. Using it as the character would throw away the skeleton.
- User comments report F1 doing nothing when the DLL is not beside `OPPW4.exe`. That is a placement failure, not evidence of a new feature.

## Bottom line

Use the Nexus v0.5 loader only if we later need a picture of what the GPU drew during one attack: the bound textures, the posed mesh, and any effect geometry on screen. It is not the way to get Zoro's skeleton, his G1A clips, or the particle system. Those already have a file path through the archives, described in `EXTRACTION_PLAN.md`.
