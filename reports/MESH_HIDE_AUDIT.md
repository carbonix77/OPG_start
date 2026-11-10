# Mesh hide audit (provisional)

Hide preset remains the runtime default. Show All is diagnostic only.

## Sanji
- Source: `private-assets/validation/merge-sanji/merged.gltf`
- Meshes: 38 total · 31 shown · 7 hidden
- Clips: `Sanji_0000`, `Sanji_0500`, `Sanji_1290`, `Sanji_1300`, `Sanji_1310`, `Sanji_1330`

| Index | Name | Verts | Skinned | Material | Why hidden | Safe? |
|------:|------|------:|:-------:|----------|------------|-------|
| 0 | model_0_submesh_0 | 88 | True |  | Owner hide; verify if outfit shell or corrupt | unknown — needs solo-mesh visual + clip proof |
| 5 | model_0_submesh_5 | 1284 | True |  | Owner hide | unknown — needs solo-mesh visual + clip proof |
| 6 | model_0_submesh_6 | 342 | True |  | Owner hide | unknown — needs solo-mesh visual + clip proof |
| 7 | model_0_submesh_7 | 530 | True |  | Owner hide | unknown — needs solo-mesh visual + clip proof |
| 10 | model_0_submesh_10 | 871 | True |  | CRITICAL: 871-vert Noesis-only cloth (no GLB twin); previously remapped to cloth slot 10, now hidden | unknown — needs solo-mesh visual + clip proof |
| 12 | model_0_submesh_12 | 581 | True |  | Owner hide | unknown — needs solo-mesh visual + clip proof |
| 24 | model_0_submesh_24 | 309 | True |  | Owner hide | unknown — needs solo-mesh visual + clip proof |

### Sanji mesh 10
Noesis mesh 10 has **871** verts, skinned=True. Earlier material work mapped it to cloth slot 10 because the GLB twin is a different 211-vert face piece. Owner hide removed the bad deformation from presentation; **do not treat hide as a geometry repair**. Restore only after Blender/weight/UV proof, not by flipping Show All in demos.

## Nami
- Source: `private-assets/validation/merge-nami/merged.gltf`
- Meshes: 24 total · 11 shown · 13 hidden
- Clips: `Nami_0000`, `Nami_NewWorld_0500`, `Nami_NewWorld_1300`

| Index | Name | Verts | Skinned | Material | Why hidden | Safe? |
|------:|------|------:|:-------:|----------|------------|-------|
| 4 | model_0_submesh_4 | 552 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 5 | model_0_submesh_5 | 240 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 6 | model_0_submesh_6 | 552 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 7 | model_0_submesh_7 | 240 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 8 | model_0_submesh_8 | 2080 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 9 | model_0_submesh_9 | 98 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 10 | model_0_submesh_10 | 407 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 11 | model_0_submesh_11 | 323 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 12 | model_0_submesh_12 | 39 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 17 | model_0_submesh_17 | 1355 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 18 | model_0_submesh_18 | 2505 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 20 | model_0_submesh_20 | 439 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 23 | model_0_submesh_23 | 747 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |

## Usopp
- Source: `private-assets/validation/merge-usopp/merged.gltf`
- Meshes: 43 total · 26 shown · 17 hidden
- Clips: `Usopp_0000`, `Usopp_0500`, `Usopp_1300`

| Index | Name | Verts | Skinned | Material | Why hidden | Safe? |
|------:|------|------:|:-------:|----------|------------|-------|
| 0 | model_0_submesh_0 | 299 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 4 | model_0_submesh_4 | 98 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 9 | model_0_submesh_9 | 123 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 10 | model_0_submesh_10 | 287 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 11 | model_0_submesh_11 | 234 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 12 | model_0_submesh_12 | 246 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 13 | model_0_submesh_13 | 1029 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 14 | model_0_submesh_14 | 154 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 16 | model_0_submesh_16 | 169 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 17 | model_0_submesh_17 | 42 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 19 | model_0_submesh_19 | 141 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 20 | model_0_submesh_20 | 634 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 21 | model_0_submesh_21 | 849 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 24 | model_0_submesh_24 | 164 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 31 | model_0_submesh_31 | 523 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 33 | model_0_submesh_33 | 2628 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |
| 35 | model_0_submesh_35 | 141 | True |  | Owner hide list (provisional presentation) | unknown — needs solo-mesh visual + clip proof |

