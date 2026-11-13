# 5v5 design note

This is a design only. No battle scene was built. One desktop character near 60 fps does not set a budget for ten characters on a phone.

## Rules that can be tested later

- Turn order is a sorted list from a seed. The same seed and the same actions produce the same order.
- An action names its target by unit id. It does not pick a target from a physics overlap.
- A skill is data: clip id, and normalized startup, active, and recovery times. The scene does not embed a character's effect.
- The clip config can carry event times. The scene reports those times. It does not know which character they belong to.
- Each unit is one instance of its own manifest. Clips are not retargeted onto another skeleton by bone name.
- Materials and meshes are created with the unit and reused. They are not rebuilt per frame.
- A performance check has to load ten instances and record frame time on the target device. Until that number exists, the budget is unknown.

The open blockers before any of that are the unverified Zoro idle and hit, per-character materials, and root motion that is still stored in the clip.
