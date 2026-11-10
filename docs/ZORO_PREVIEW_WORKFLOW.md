# Zoro preview workflow

This is the path that has been used for Zoro. It is not a canonical importer, and it has not been run on another character. Original extracts stay out of git. Development screenshots may stay in `reports/screenshots/` while this prototype is being checked.

## Import

1. Copy the character `.g1m`, its `.oid`, and only the `.g1a` files under test into an empty folder under `private-assets/validation/`.
2. Project G1M's "Merge all assets in the same folder" item is a saved checkbox. `Noesis64.exe ?runtool "Merge all assets in the same folder"` flips it. It does not write a file.
3. From off, one flip then `?cmode` writes the glTF. If that file has no clip names, flip once more and export again.
4. Flip once more and export a control file. The control file should name none of the clips. That leaves the checkbox off.
5. Load the glTF in the inspector. Do not retarget a Noesis `SK_Skeleton` clip onto the GLB `bone_N` skeleton by name.

## Animation

Play one group at a time. The bind pose is a T-pose, not an idle. A small root translation is not enough to name a clip. Sample 0, 0.25, 0.5, 0.75, and 1 before calling a clip a loop. `Zoro_1320`, `Zoro_1322`, and `Zoro_1324` stay separate clips.

The provisional idle-to-attack path uses one Noesis file that already contains `Zoro_0000` and `Zoro_1330` on `SK_Skeleton`. A second local file adds `Zoro_0500`, `Zoro_0650`, `Zoro_0060`, and `Zoro_1320` beside `Zoro_0000`. The roster file puts `Zoro_0000`, `Zoro_0500`, `Zoro_0650`, `Zoro_1330`, `Zoro_1320`, `Zoro_0060`, and `Zoro_0061` on one skeleton, and keeps `Zoro_1322` and `Zoro_1324` as separate phantom clips. Behavior, then idle plays the labeled clip only when it is already in the loaded file. `Selected clip, then idle` plays a clip only when it is already in the loaded file. The page can loop `Zoro_0000`, play `Zoro_1330` once, and return to that loop. It does not copy either clip onto the GLB `bone_N` skeleton. That file has no textures. The GLB remains the textured comparison.

Preview recenter cancels the follow node's world X and Z on a parent. It does not edit keys. Looping still restarts the stored root motion when recenter is off.

## Materials and swords

`preview/textures/zoro/map.json` applies to materials named `Material_N`. On a Noesis mesh it uses the GLB material slot of the same mesh index, after the vertex counts matched. It is a reconstructed assignment. The mouth blade, mesh 36, uses slot 33. The map still sends that slot to `cloth`. The preview puts the whole `weapon.png` sheet on mesh 36 instead. Mesh 36 is skinned to a child of `SK_Head` and keeps that bone's keys. The sword-shell preset stays off until it is selected, and show all stays available. A mouth-mesh crop can sample part of an existing sheet. It is off by default and is not an original texture. The cinematic camera keys and the preview trails, bloom, and particle burst live in that same config. The scene plays whatever config it is given. `previewForAsset` returns null for an id that is not registered. Those effects follow one measured vertex on the named mesh, or the bone offset when no mesh is named, and are not claimed as the game's effects. Save cinematic recording keeps the WebM on this machine. Clip names, mesh indices, and the stage live in the preview config, not in the scene class.

Hand stacks `17` with `27`, and `30` with `33` and `39`, stay overlapped through the sampled clips. Confirmed hand shells hides 27, 30, and 33 only after their centers stay within the configured gap on every labeled clip. Hip meshes stay, and Show all returns when the action ends. The phantom copies use the same material map when temporary textures are on. Hiding meshes 3, 22, 23, and 24 is a temporary diagnostic for tiny world-static meshes.

## Battle preview

Choose Mode → Battle preview. The page loads the roster file, places a synthetic dummy box, and enables temporary textures. Basic Attack plays `Zoro_0500`, applies damage once at the skill contact marker, returns to `Zoro_0000`, then resolves the dummy poke. Experimental skills stay available on the same path. Reset restores HP and idle. This is a vertical slice, not a finished 5v5.

## Review frames

"Viewport only" hides the panel. Frame the character after the pose is set, so a root-motion frame does not include world-static meshes. Put the PNGs in `reports/screenshots/` with the clip and time in the file name.
