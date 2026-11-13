"""
Import a character GLB, keep only listed animation actions, export a slim battle GLB.

Usage:
  D:\\blender\\blender.exe --background --python tools/glb_trim_battle_anims.py -- \\
    --src PATH --dst PATH --keep Idle,Attack,Block \\
    [--report PATH] [--hidden-json PATH]

Meshes, materials, skins, and custom props (including extras.hidden) are preserved.
Unused Zoro_#### (or similar) actions are removed so the export stays small.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy


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


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _shell_key(name: str) -> str:
    base = name.split(".")[0]
    if "_noesis_meshnode_" in base:
        return base.split("_noesis_meshnode_")[0]
    return base


def apply_hidden_json(path: Path | None) -> int:
    """Hide or delete meshes listed in JSON. Delete removes T-pose shell duplicates from battle GLBs."""
    if path is None or not path.exists():
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        names = set(data)
        # Lists default to hide-only — Zoro toggles some hidden meshes back on per clip.
        delete = False
    elif isinstance(data, dict):
        raw = data.get("hidden") or data.get("hidden_meshes") or data.get("names") or []
        names = set(raw)
        delete = bool(data.get("delete", False))
    else:
        names = set()
        delete = False
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


def main() -> int:
    args = parse_args(sys.argv)
    src = Path(args["src"])
    dst = Path(args["dst"])
    keep = {name.strip() for name in args["keep"].split(",") if name.strip()}
    report_path = Path(args["report"]) if args.get("report") else None
    hidden_json = Path(args["hidden-json"]) if args.get("hidden-json") else None

    if not src.exists():
        raise SystemExit(f"missing source GLB: {src}")
    if not keep:
        raise SystemExit(" --keep must list at least one action name")

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(src))

    before = sorted(a.name for a in bpy.data.actions)
    removed: list[str] = []
    for action in list(bpy.data.actions):
        if action.name in keep:
            continue
        removed.append(action.name)
        bpy.data.actions.remove(action)

    stamped = apply_hidden_json(hidden_json)

    # Drop unused datablocks so export does not keep orphan anim curves.
    for _ in range(3):
        bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)

    after = sorted(a.name for a in bpy.data.actions)
    missing = sorted(keep - set(after))
    dst.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(dst),
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

    size = dst.stat().st_size if dst.exists() else 0
    payload = {
        "status": "OK" if not missing and dst.exists() else "FAIL",
        "src": str(src),
        "dst": str(dst),
        "size_bytes": size,
        "actions_before": len(before),
        "actions_after": after,
        "removed_count": len(removed),
        "missing_keep": missing,
        "hidden_stamped": stamped,
        "note": "hidden_stamped counts meshes hidden or deleted via --hidden-json",
    }
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 0 if payload["status"] == "OK" else 1


if __name__ == "__main__":
    raise SystemExit(main())
