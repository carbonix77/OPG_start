# Character pipeline

The inspector scene does not contain a character's clip names or mesh ids. Those live in `previewConfig.ts`, and `previewForAsset` returns null for an id that is not registered. `noesis-present` is the cinematic Zoro file. `noesis-moves` is the earlier five-clip file. `noesis-roster` is one skeleton with the labeled moves, plus optional phantom clips. `fixture` is a generated config with no mouth mesh and no cinematic. A roster check returned `zoro-roster`, two phantom entries, and null for an unknown id.

Battle data lives in `app/src/combat/` manifests. The headless engine takes unit ids and skill ids from those manifests. Battle preview mode loads the roster asset and a synthetic dummy; it does not put Zoro names inside the engine.

## What a second character takes

1. Copy that character's `.g1m`, `.oid`, and only the `.g1a` files under test into an empty folder under `private-assets/validation/`.
2. From the merge checkbox off, flip it once and export with `?cmode`. If the glTF names none of the clips, flip once more and export again.
3. Flip once more and write a control glTF. It should name none of the clips. That leaves the checkbox off.
4. Add an asset id that points at the glTF, and a config object: texture directory, behavior labels, material slots, weapon notes, and optional phantom clips. Register that id. Do not put those names in the scene class.
5. Load it in the inspector. Behavior, then idle plays a clip only when it is already in the file. Do not retarget clips onto another skeleton by bone name.

The roster export used nine clips that were already copied locally. Noesis wrote the glTF in about 1.5 seconds, and the control export took about 1.2 seconds. The manual part for a new character is still the copy from the game install, the export, and filling the config. Sword groups, the mouth mesh, and phantom clip names stay in that config. The scene applies the same material map to phantom copies and clears them on model switch. A second character still needs its own measured sword groups. Coincident centers are not enough to delete a mesh. Material slots are still a reconstructed match, not a recovered shader. Root motion is still inside the clip. There is no shared retarget. Extracts stay gitignored. That is the blocker to tens of characters, before any 5v5 scene exists. No second copyrighted character was extracted.

## Second fixture

`fixtureSequence` builds a rig named `rig-root` and `rig-limb`, plays `fixture-action` once, then `fixture-idle`. The action moved 4 units and the idle clip set the limb back to the origin. `fixtureMoveset` uses different bones, `rig-spine` and `rig-arm`. Action A moved 5, action B moved 3, the reaction moved 2, and the idle clip returned all three axes. No character name was used. The older trail fixture still moves a generated box by 3 units. An unknown asset id still returns null.
