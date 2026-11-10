# Character pipeline

The inspector scene does not contain a character's clip names or mesh ids. Those live in `previewConfig.ts`, and `previewForAsset` returns null for an id that is not registered. `noesis-present` is the cinematic Zoro file. `noesis-moves` is the same look with `Zoro_0000`, `Zoro_0500`, `Zoro_0650`, `Zoro_0060`, and `Zoro_1320`. `fixture` is a generated config with no mouth mesh and no cinematic.

## What a second character takes

1. Copy that character's `.g1m`, `.oid`, and only the `.g1a` files under test into an empty folder under `private-assets/validation/`.
2. From the merge checkbox off, flip it once and export with `?cmode`. If the glTF names none of the clips, flip once more and export again.
3. Flip once more and write a control glTF. It should name none of the clips. That leaves the checkbox off.
4. Add an asset id that points at the glTF, and a config object: texture directory, clip names, material slots, weapon groups, and optional camera keys. Register that id. Do not put those names in the scene class.
5. Load it in the inspector. Do not retarget clips onto another skeleton by bone name.

The manual part is the export plus filling the config. Material slots are still a reconstructed match, not a recovered shader. Root motion is still inside the clip. There is no shared retarget. Extracts stay gitignored. That is the blocker to tens of characters, before any 5v5 scene exists.

## Second fixture

`fixtureSequence` builds a rig named `rig-root` and `rig-limb`, plays `fixture-action` once, then `fixture-idle`. The action moved 4 units and the idle clip set the limb back to the origin. No character name was used. The older trail fixture still moves a generated box by 3 units. An unknown asset id still returns null.
