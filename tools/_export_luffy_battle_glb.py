"""
Export slim Luffy battle GLB from the updated Luffy.blend.

Keeps named battle clips only, deletes shell meshes from Luffy_hidden_meshes.json,
writes Blender_Models/Luffy/Luffy.glb and private-assets/glb/luffy.glb.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy

BLEND = Path(r"D:\Projects\OnePieceGame\Blender_Models\Luffy\Luffy.blend")
HIDDEN = Path(r"D:\Projects\OnePieceGame\Blender_Models\Luffy\Luffy_hidden_meshes.json")
OUT_FULL = Path(r"D:\Projects\OnePieceGame\Blender_Models\Luffy\Luffy.glb")
OUT_BATTLE = Path(r"D:\Projects\OnePieceGame\OPG_start\private-assets\glb\luffy.glb")
REPORT = Path(r"D:\Projects\OnePieceGame\OPG_start\private-assets\glb\reports\trim-luffy.json")

KEEP = {
    "Idle",
    "Attack",
    "Block",
    "Hit",
    "Death",
    "Bazooka",
    "Gattling",
}


def _shell_key(name: str) -> str:
    base = name.split(".")[0]
    if "_noesis_meshnode_" in base:
        return base.split("_noesis_meshnode_")[0]
    return base


def apply_hidden_json(path: Path) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    names = set(data.get("hidden") or [])
    delete = bool(data.get("delete", False))
    keys = {_shell_key(n) for n in names}
    touched = 0
    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            continue
        short = obj.name.split(".")[0]
        key = _shell_key(obj.name)
        if obj.name not in names and short not in names and key not in keys:
            continue
        if delete:
            bpy.data.objects.remove(obj, do_unlink=True)
        else:
            obj.hide_viewport = True
            obj.hide_render = True
            obj["hidden"] = True
        touched += 1
    return touched


def clear_pose(arm) -> None:
    if arm.animation_data:
        arm.animation_data.action = None
        try:
            arm.animation_data.action_slot = None
        except Exception:
            pass
    for pb in arm.pose.bones:
        pb.location = (0.0, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 1.0)
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        pb.rotation_euler = (0.0, 0.0, 0.0)


def assign_idle(arm) -> None:
    idle = bpy.data.actions.get("Idle")
    if not idle:
        return
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = idle
    for slot in list(getattr(arm.animation_data, "action_suitable_slots", []) or []):
        if slot.identifier == "OBArmature":
            arm.animation_data.action_slot = slot
            break


def export_glb(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_nla_strips=False,
        export_skins=True,
        export_morph=True,
        export_apply=False,
        export_extras=True,
        export_yup=True,
    )


def main() -> int:
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    before = sorted(a.name for a in bpy.data.actions)
    removed = []
    for action in list(bpy.data.actions):
        if action.name in KEEP:
            continue
        removed.append(action.name)
        bpy.data.actions.remove(action)

    stamped = apply_hidden_json(HIDDEN) if HIDDEN.exists() else 0

    arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
    if arm:
        clear_pose(arm)
        assign_idle(arm)

    for _ in range(3):
        bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)

    after = sorted(a.name for a in bpy.data.actions)
    missing = sorted(KEEP - set(after))
    export_glb(OUT_FULL)
    export_glb(OUT_BATTLE)

    payload = {
        "status": "OK" if not missing and OUT_BATTLE.exists() else "FAIL",
        "src": str(BLEND),
        "dst": str(OUT_BATTLE),
        "dst_full": str(OUT_FULL),
        "size_bytes": OUT_BATTLE.stat().st_size if OUT_BATTLE.exists() else 0,
        "size_full_bytes": OUT_FULL.stat().st_size if OUT_FULL.exists() else 0,
        "actions_before": len(before),
        "actions_after": after,
        "removed_count": len(removed),
        "missing_keep": missing,
        "hidden_stamped": stamped,
        "meshes_after": sorted(o.name for o in bpy.data.objects if o.type == "MESH"),
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 0 if payload["status"] == "OK" else 1


if __name__ == "__main__":
    raise SystemExit(main())
