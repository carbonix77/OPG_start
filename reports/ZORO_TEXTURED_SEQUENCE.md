# Textured Noesis sequence

This follows issue #11. The animation path stays the Noesis file with `Zoro_0000` and `Zoro_1330` on `SK_Skeleton`. The textured GLB stays a separate comparison. Neither is the canonical model. No clip was retargeted. No mesh was deleted. `map.json` was not edited.

## Mesh index

The GLB and `merge-present/merged.gltf` each have 40 meshes. Mesh index N has the same vertex count in both files, for every N from 0 through 39. The Noesis file has no material slots. The GLB material slot is not always the mesh index: 11 and 12 are swapped, 20 and 21 are swapped, and material 20 is shared by meshes 21 through 24. Mesh 36 uses material 33.

The temporary look now uses that GLB slot when the mesh is not named `Material_N`, then the existing `map.json` sheet. Sword sheets stay marked guessed. Material 33 is still `cloth`. This is the reconstructed map copied across a matched index. It is not a recovered G1T assignment. Turning the checkbox off restores the loaded material.

Submesh 36 received `temp-mesh-index-33` and `cloth.png`.

## Frames

16:9 canvas, 1920 by 1080. Viewport only. Preview recenter on. Tiny world-static meshes hidden. Every sword mesh stays visible.

| Frame | File | What is visible |
| --- | --- | --- |
| Idle, time 0.5, radius 240 | `zoro-tex-present-idle.png` | Green hair, scar, white shirt, sash, black trousers. One blade tip leaves the frame |
| Idle, time 0.5, radius 380 | `zoro-tex-present-idle-wide.png` | Same look. Both long blades stay in the frame. Stacked grips remain |
| `Zoro_1330` at 0.35 | `zoro-tex-present-1330-t035.png` | Crouch, blade across the face, two blades raised. Raised tips meet the top edge |
| `Zoro_1330` at 0.65 | `zoro-tex-present-1330-t065.png` | Airborne, swords in both hands, one across the face. Left tip meets the frame edge |
| Return, `Zoro_0000` at 0 | `zoro-tex-present-return.png` | Same stance as the idle. Blades in frame |

Attack uses a wider fit than idle. The minimum radius is 380.

## Mouth sword

There is no bone named jaw. `SK_Head` has a child named `F_Chin`. Distance is from that bone to the submesh 36 box, so 0 means the bone is inside the box.

| Sample | Head to blade | Chin to blade |
| --- | --- | --- |
| `Zoro_0000` at 0 | 28 | 30 |
| `Zoro_0000` at 0.5 | 26 | 28 |
| `Zoro_1330` at 0.35 | 0 | 0 |
| `Zoro_1330` at 1 | 40 | 42 |

The blade box contains the head and chin at the sampled middle of the attack. It stays near them during the idle and is farther at the attack's last frame. That does not prove a jaw parent. Hand stacks were not hidden.

## Transition

`Zoro_1330` at time 1 and `Zoro_0000` at time 0 were compared in the root's space. Spine, neck, head, and both hands differ by only a few units. The right hand delta is about 2, 2, 6. The pose does not jump. The root local Z does: about 533 at the end of `Zoro_1330`, and 0 at the start of `Zoro_0000`.

With preview recenter, world Z is 0 at both samples. Local Z stays 533 until the next clip starts. The clip keys are unchanged. A 0.28 second weight crossfade runs at the handoff. It does not remove the stored root reset. Without recenter, the character would still teleport on X and Z.

## Not done

- The sheet map is still reconstructed.
- Sword stacks still overlap. No stack member was hidden.
- `Zoro_0000` is still a provisional idle.
- Asura phantoms were not spawned.
