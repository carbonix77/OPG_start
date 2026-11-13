"""
Fix Blender 5 action slots that still target imported duplicates (OBArmature.001 → OBArmature).

Appended anims imported as Armature.001; deleting that object left slots unbound.
Stripping the .### suffix rebinds them to the original armature / objects.
Does not modify meshes, materials, or action curves — only slot identifiers.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import bpy

SUFFIX = re.compile(r"^(.*)\.(\d+)$")


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


def strip_suffix(value: str | None) -> str | None:
    if not value:
        return value
    match = SUFFIX.match(value)
    return match.group(1) if match else value


def fix_action(action) -> int:
    changed = 0
    slots = getattr(action, "slots", None)
    if not slots:
        return 0
    for slot in slots:
        new_id = strip_suffix(getattr(slot, "identifier", None))
        new_nd = strip_suffix(getattr(slot, "name_display", None))
        if new_id and new_id != slot.identifier:
            slot.identifier = new_id
            changed += 1
        if new_nd and new_nd != slot.name_display:
            try:
                slot.name_display = new_nd
            except Exception:
                pass
    return changed


def main() -> int:
    args = parse_args(sys.argv)
    blend = Path(args["blend"])
    report = Path(args["report"]) if args.get("report") else None
    bpy.ops.wm.open_mainfile(filepath=str(blend))

    fixed_actions = 0
    fixed_slots = 0
    samples = []
    for action in bpy.data.actions:
        n = fix_action(action)
        if n:
            fixed_actions += 1
            fixed_slots += n
            if len(samples) < 8:
                slots = getattr(action, "slots", [])
                samples.append(
                    {
                        "action": action.name,
                        "slots_sample": [s.identifier for s in list(slots)[:4]],
                    }
                )

    # Point armature at a previously-broken action to verify slot binding.
    verify = {}
    arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
    test = bpy.data.actions.get("Luffy_0002") or bpy.data.actions.get("Franky_0002")
    if arm and test:
        if arm.animation_data is None:
            arm.animation_data_create()
        arm.animation_data.action = test
        slot = arm.animation_data.action_slot
        verify = {
            "armature": arm.name,
            "test_action": test.name,
            "action_slot": slot.identifier if slot else None,
            "suitable": [s.identifier for s in list(arm.animation_data.action_suitable_slots)[:5]],
        }

    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    payload = {
        "status": "OK",
        "blend": str(blend),
        "fixed_actions": fixed_actions,
        "fixed_slots": fixed_slots,
        "samples": samples,
        "verify": verify,
    }
    if report:
        report.parent.mkdir(parents=True, exist_ok=True)
        report.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
