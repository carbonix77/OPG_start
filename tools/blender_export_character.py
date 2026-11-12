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


def _sheet_lookup(map_json: dict) -> dict[str, str]:
    sheet_by_key: dict[str, str] = {}
    if not isinstance(map_json, dict):
        return sheet_by_key
    if "slots" in map_json and isinstance(map_json["slots"], list):
        for index, sheet in enumerate(map_json["slots"]):
            if isinstance(sheet, str) and sheet:
                sheet_by_key[str(index)] = sheet
    else:
        for key, value in map_json.items():
            if isinstance(value, str) and value and key not in ("note", "version"):
                sheet_by_key[str(key)] = value
    return sheet_by_key


def _bind_sheet_to_material(mat, png: Path) -> None:
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    tex = nodes.new("ShaderNodeTexImage")
    image = bpy.data.images.load(str(png))
    # Keep a unique image datablock per bind so exporters embed each used sheet.
    image.name = f"sheet_{png.stem}_{mat.name}"
    tex.image = image
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])


def _mesh_index(name: str) -> int | None:
    import re

    hit = re.search(r"(?:Mesh_|submesh_|mesh_)(\d+)", name, re.I)
    return int(hit.group(1)) if hit else None


def apply_texture_sheets(
    texture_dir: Path,
    map_json: dict,
    slot_by_mesh: list[int] | None,
    sheet_by_mesh: dict[str, str] | None = None,
) -> dict:
    """Bind decoded PNG sheets onto mesh materials using map.json + optional slot remap."""
    if not texture_dir.exists():
        return {"materials": 0, "meshes": 0, "images": 0}
    sheet_by_key = _sheet_lookup(map_json)
    overrides = sheet_by_mesh or {}
    mat_applied = 0
    mesh_applied = 0

    # Prefer per-mesh assignment (Noesis materials often lack Material_N names).
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        index = _mesh_index(obj.name)
        if index is None:
            continue
        slot = index
        if slot_by_mesh is not None and 0 <= index < len(slot_by_mesh):
            slot = slot_by_mesh[index]
        sheet = overrides.get(str(index)) or sheet_by_key.get(str(slot)) or sheet_by_key.get(str(index))
        if not sheet:
            continue
        png = texture_dir / f"{sheet}.png"
        if not png.exists():
            continue
        if not obj.data.materials:
            mat = bpy.data.materials.new(name=f"mesh_{index}_{sheet}")
            obj.data.materials.append(mat)
        for mat in obj.data.materials:
            if mat is None:
                continue
            _bind_sheet_to_material(mat, png)
            mesh_applied += 1
        mat_applied += 1

    # Fallback: material-name matching for files that already have Material_N.
    if mesh_applied == 0:
        for mat in bpy.data.materials:
            sheet = sheet_by_key.get(mat.name)
            if not sheet:
                digits = "".join(ch for ch in mat.name if ch.isdigit())
                if digits:
                    sheet = sheet_by_key.get(digits)
            if not sheet:
                continue
            png = texture_dir / f"{sheet}.png"
            if not png.exists():
                continue
            _bind_sheet_to_material(mat, png)
            mat_applied += 1

    images = sum(1 for img in bpy.data.images if img.filepath or img.size[0] > 0)
    return {"materials": mat_applied, "meshes": mesh_applied, "images": images}


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
    slots_path = Path(args["slots"]) if args.get("slots") else None
    mode = args.get("mode", "ACTIONS")
    slot_by_mesh = None
    sheet_by_mesh: dict[str, str] | None = None
    if slots_path and slots_path.exists():
        raw = json.loads(slots_path.read_text(encoding="utf-8"))
        if isinstance(raw, list):
            slot_by_mesh = [int(x) for x in raw]
        elif isinstance(raw, dict):
            if isinstance(raw.get("slotByMesh"), list):
                slot_by_mesh = [int(x) for x in raw["slotByMesh"]]
            if isinstance(raw.get("sheetByMesh"), dict):
                sheet_by_mesh = {str(k): str(v) for k, v in raw["sheetByMesh"].items() if v}

    reset_scene()
    import_gltf(gltf)
    map_json = load_map(map_path) if map_path else {}
    texture_stats = (
        apply_texture_sheets(texture_dir, map_json, slot_by_mesh, sheet_by_mesh) if texture_dir else {"materials": 0, "meshes": 0, "images": 0}
    )
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
    after_images = len([img for img in bpy.data.images if img.packed_file is not None or (img.size[0] > 0)])

    missing = sorted(set(before_actions) - set(after_actions))
    clips_ok = out.exists() and len(missing) == 0
    textured = texture_stats.get("meshes", 0) > 0 or texture_stats.get("materials", 0) > 0
    if clips_ok and textured:
        status = "PASS"
    elif clips_ok:
        status = "PARTIAL"
    else:
        status = "FAIL"

    payload = {
        "character": character,
        "source_gltf": str(gltf),
        "output_glb": str(out),
        "size_bytes": out.stat().st_size if out.exists() else 0,
        "export_mode_requested": mode,
        "textures_applied": texture_stats.get("materials", 0),
        "texture_stats": texture_stats,
        "status": status,
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
            "images": after_images,
        },
        "missing_actions": missing,
        "extra_actions": sorted(set(after_actions) - set(before_actions)),
        "ok": status == "PASS",
        "clips_ok": clips_ok,
    }
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "character": character,
                "status": status,
                "glb": str(out),
                "actions": payload["glb_reimport"]["action_count"],
                "textures": texture_stats,
            }
        )
    )
    return 0 if clips_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
