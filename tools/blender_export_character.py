"""
Blender background exporter: Noesis merged glTF (+ optional textures) → local GLB.

Invoked by tools/export_all_characters.py via:
  D:\\blender\\blender.exe --background --python tools/blender_export_character.py -- <args>
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


def import_gltf(path: Path) -> None:
    bpy.ops.import_scene.gltf(filepath=str(path))


def load_map(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def apply_texture_sheets(texture_dir: Path, map_json: dict) -> int:
    """Best-effort: bind decoded PNG sheets onto materials by map.json keys."""
    if not texture_dir.exists():
        return 0
    applied = 0
    # map.json shapes vary; accept { "Material_N": "sheet" } or { "slots": [...] }.
    sheet_by_key: dict[str, str] = {}
    if isinstance(map_json, dict):
        if "slots" in map_json and isinstance(map_json["slots"], list):
            for index, sheet in enumerate(map_json["slots"]):
                if isinstance(sheet, str) and sheet:
                    sheet_by_key[str(index)] = sheet
                    sheet_by_key[f"Material_{index:02d}"] = sheet
                    sheet_by_key[f"Material_{index}"] = sheet
        else:
            for key, value in map_json.items():
                if isinstance(value, str) and value and key not in ("note", "version"):
                    sheet_by_key[str(key)] = value

    for mat in bpy.data.materials:
        sheet = sheet_by_key.get(mat.name)
        if not sheet:
            # try trailing digits
            digits = "".join(ch for ch in mat.name if ch.isdigit())
            if digits:
                sheet = sheet_by_key.get(digits) or sheet_by_key.get(f"Material_{int(digits):02d}")
        if not sheet:
            continue
        png = texture_dir / f"{sheet}.png"
        if not png.exists():
            continue
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()
        out = nodes.new("ShaderNodeOutputMaterial")
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")
        tex = nodes.new("ShaderNodeTexImage")
        image = bpy.data.images.load(str(png))
        tex.image = image
        links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
        applied += 1
    return applied


def animation_names() -> list[str]:
    names: list[str] = []
    for action in bpy.data.actions:
        names.append(action.name)
    return sorted(set(names))


def mesh_stats() -> tuple[int, int]:
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    verts = sum(len(obj.data.vertices) for obj in meshes)
    return len(meshes), verts


def armature_bones() -> int:
    total = 0
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            total += len(obj.data.bones)
    return total


def export_glb(path: Path, mode: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    kwargs = dict(
        filepath=str(path),
        export_format="GLB",
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_skins=True,
        export_morph=True,
        export_animations=True,
        export_force_sampling=True,
        export_nla_strips=True,
        export_def_bones=False,
        export_apply=False,
    )
    # Blender 4+/5 animation mode enum differs; try preferred then fallbacks.
    tried = []
    for anim_mode in (mode, "ACTIONS", "ACTIVE_ACTIONS", "NLA_TRACKS"):
        if anim_mode in tried:
            continue
        tried.append(anim_mode)
        try:
            bpy.ops.export_scene.gltf(export_animation_mode=anim_mode, **kwargs)
            return
        except TypeError:
            # Older/newer signature without export_animation_mode
            try:
                bpy.ops.export_scene.gltf(**kwargs)
                return
            except Exception as exc:  # noqa: BLE001
                last = exc
        except Exception as exc:  # noqa: BLE001
            last = exc
            continue
    raise RuntimeError(f"GLB export failed after modes {tried}: {last}")


def main() -> int:
    args = parse_args(sys.argv)
    character = args.get("character", "sanji")
    gltf = Path(args["gltf"])
    out = Path(args["out"])
    report = Path(args["report"])
    texture_dir = Path(args["textures"]) if args.get("textures") else None
    map_path = Path(args["map"]) if args.get("map") else (texture_dir / "map.json" if texture_dir else None)
    mode = args.get("mode", "ACTIONS")

    reset_scene()
    import_gltf(gltf)
    map_json = load_map(map_path) if map_path else {}
    textures_applied = apply_texture_sheets(texture_dir, map_json) if texture_dir else 0
    before_actions = animation_names()
    meshes, verts = mesh_stats()
    bones = armature_bones()

    export_glb(out, mode)

    # Re-import the GLB into a fresh scene to validate round trip inside Blender.
    reset_scene()
    import_gltf(out)
    after_actions = animation_names()
    after_meshes, after_verts = mesh_stats()
    after_bones = armature_bones()

    payload = {
        "character": character,
        "source_gltf": str(gltf),
        "output_glb": str(out),
        "size_bytes": out.stat().st_size if out.exists() else 0,
        "export_mode_requested": mode,
        "textures_applied": textures_applied,
        "source": {
            "actions": before_actions,
            "action_count": len(before_actions),
            "meshes": meshes,
            "vertices": verts,
            "bones": bones,
        },
        "glb_reimport": {
            "actions": after_actions,
            "action_count": len(after_actions),
            "meshes": after_meshes,
            "vertices": after_verts,
            "bones": after_bones,
        },
        "missing_actions": sorted(set(before_actions) - set(after_actions)),
        "extra_actions": sorted(set(after_actions) - set(before_actions)),
        "ok": out.exists() and len(set(before_actions) - set(after_actions)) == 0,
    }
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"character": character, "ok": payload["ok"], "glb": str(out), "actions": payload["glb_reimport"]["action_count"]}))
    return 0 if payload["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
