"""
Import animation actions from one or more GLBs into a character .blend.

Keeps existing actions (including Idle/Attack/Bazooka). Deletes imported
objects/meshes/materials/images/armatures so mesh & texture data stay untouched.

After import, renames action slots OBArmature.001 → OBArmature so they bind to
the existing armature (Blender 5 slotted actions).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import bpy

SLOT_SUFFIX = re.compile(r"^(.*)\.(\d+)$")


def rebind_action_slots(action) -> int:
    """Strip .001-style suffixes from Blender 5 action slot identifiers."""
    slots = getattr(action, "slots", None)
    if not slots:
        return 0
    changed = 0
    for slot in slots:
        ident = getattr(slot, "identifier", None)
        if ident:
            match = SLOT_SUFFIX.match(ident)
            if match and match.group(1) != ident:
                slot.identifier = match.group(1)
                changed += 1
        display = getattr(slot, "name_display", None)
        if display:
            match = SLOT_SUFFIX.match(display)
            if match:
                try:
                    slot.name_display = match.group(1)
                except Exception:
                    pass
    return changed



def parse_args(argv: list[str]) -> dict[str, str]:
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    out: dict[str, str] = {}
    i = 0
    while i < len(argv):
        key = argv[i]
        if key.startswith("--") and i + 1 < len(argv):
            out[key[2:]] = argv[i + 1]
            i += 2
        else:
            i += 1
    return out


def base_name(name: str) -> str:
    return name.split(".")[0]


def purge_imported(before_objects: set, before_actions: set) -> tuple[list[str], list[str]]:
    imported_objs = [o for o in bpy.data.objects if o not in before_objects]
    new_actions = [a for a in bpy.data.actions if a not in before_actions]

    kept: list[str] = []
    dropped: list[str] = []
    protect = getattr(purge_imported, "protect", set())

    for action in list(new_actions):
        stem = base_name(action.name)
        if stem in protect or action.name in protect:
            dropped.append(action.name)
            bpy.data.actions.remove(action)
            continue
        # Collapse Blender duplicate suffixes onto clean names when free.
        if action.name != stem and stem not in {a.name for a in bpy.data.actions}:
            action.name = stem
        action.use_fake_user = True
        rebind_action_slots(action)
        kept.append(action.name)

    for obj in imported_objs:
        bpy.data.objects.remove(obj, do_unlink=True)

    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for arm in list(bpy.data.armatures):
        if arm.users == 0:
            bpy.data.armatures.remove(arm)
    for mat in list(bpy.data.materials):
        if mat.users == 0:
            bpy.data.materials.remove(mat)
    for img in list(bpy.data.images):
        if img.users == 0:
            bpy.data.images.remove(img)
    for node in list(bpy.data.node_groups):
        if node.users == 0:
            bpy.data.node_groups.remove(node)

    return kept, dropped


def main() -> int:
    args = parse_args(sys.argv)
    blend = Path(args["blend"])
    glb_list = Path(args["glb-list"])
    report = Path(args["report"])
    protect = {n.strip() for n in args.get("protect", "").split(",") if n.strip()}
    purge_imported.protect = protect

    bpy.ops.wm.open_mainfile(filepath=str(blend))
    before_all_actions = sorted(a.name for a in bpy.data.actions)

    glbs = [Path(p) for p in json.loads(glb_list.read_text(encoding="utf-8"))]
    kept_all: list[str] = []
    dropped_all: list[str] = []

    for glb in glbs:
        if not glb.exists():
            print(f"missing glb: {glb}")
            continue
        print(f"import actions from {glb.name}...", flush=True)
        before_objects = set(bpy.data.objects)
        before_actions = set(bpy.data.actions)
        bpy.ops.import_scene.gltf(filepath=str(glb))
        kept, dropped = purge_imported(before_objects, before_actions)
        kept_all.extend(kept)
        dropped_all.extend(dropped)
        print(f"  kept {len(kept)}, dropped dupes {len(dropped)}", flush=True)
        # Grow protect so later batches don't collide.
        protect.update(base_name(n) for n in kept)
        purge_imported.protect = protect

    after = sorted(a.name for a in bpy.data.actions)
    # Save blend in place — mesh/material datablocks unchanged aside from orphan purge of imports.
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))

    payload = {
        "status": "OK",
        "blend": str(blend),
        "actions_before": len(before_all_actions),
        "actions_after": len(after),
        "added": sorted(set(kept_all)),
        "added_count": len(set(kept_all)),
        "dropped_duplicates": sorted(set(dropped_all)),
        "protected_still_present": sorted(n for n in ("Idle", "Attack", "Bazooka") if n in set(after)),
        "named_customs": [n for n in after if not n.startswith("Luffy")],
    }
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({k: payload[k] for k in ("status", "actions_before", "actions_after", "added_count", "protected_still_present", "named_customs")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
