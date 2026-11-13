# REVIEW #27 follow-up pack (Issue #26 focused next actions)

Commit will land on `research/phase-1-extraction` after this note.

## Gate answers
| Gate | Result |
|------|--------|
| Hide preset default + Show All | Done. Battle checkbox + inspector “Respect owner hide preset”. Drivers stay hidden. |
| Mesh audit for every hidden index | `reports/MESH_HIDE_AUDIT.md` (+ JSON). Sanji mesh 10 = 871-vert skinned cloth, still provisional hide. |
| Sanji idle consistency | `Sanji_0000` holds near T-pose at t=0, .25, .5, .75 in battle. Not a missing-clip bug; candidate idle itself reads open-arm. See `SANJI_IDLE_DIAGNOSTIC.md`. |
| Nami/Usopp root identity | Foot tags `Nami [nami]` / `Usopp [usopp]` match load map `nami←noesis-nami @ [220,0,110]`, `usopp←noesis-usopp @ [220,0,-110]`. Selecting Nami damages Nami HP. |
| Blender | **Not installed.** Request owner install approval. Local packages prepared under ignored `private-assets/blender/{sanji,nami,usopp,zoro}/`. Doc: `docs/BLENDER_CHARACTER_CLEANUP.md`. |
| 2v2 contact / heap | Zoro basic → Nami 80→62; full round earlier → Nami 46, Zoro 77. Heap after 5 resets: **123–146 MB** (cold remount can spike ~249 MB). |

## Tests
`npm test` 17/17 · `npm run build` OK.

## Screenshots (`reports/screenshots/`)
- `review27-battle-idle-tags.png` — name tags + hide preset
- `review27-battle-framed.png` — wider alpha so all four fit
- `review27-sanji-idle-t0.png` / `review27-sanji-idle-t75.png` — same clip phases
- `review27-show-all-meshes.png` — diagnostic Show All (extra grey/corrupt shells return)
- `review27-after-zoro-contact.png` — Nami 62/80, Sanji’s turn

## Explicit owner ask
Approve installing **Blender LTS** so the Sanji no-edit glTF→GLB round trip can run. No install has been performed.
