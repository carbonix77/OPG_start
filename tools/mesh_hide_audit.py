"""Offline mesh audit for owner hide lists. Reads local Noesis merges only."""
from __future__ import annotations

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
VAL = ROOT / "private-assets" / "validation"

# Owner hide lists (must match previewConfig.ts)
HIDES = {
    "sanji": {
        "merge": "merge-sanji",
        "indices": [0, 5, 6, 7, 10, 12, 24],
        "notes": {
            0: "Owner hide; verify if outfit shell or corrupt",
            5: "Owner hide",
            6: "Owner hide",
            7: "Owner hide",
            10: "CRITICAL: 871-vert Noesis-only cloth (no GLB twin); previously remapped to cloth slot 10, now hidden",
            12: "Owner hide",
            24: "Owner hide",
        },
    },
    "nami": {
        "merge": "merge-nami",
        "indices": [4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 18, 20, 23],
        "notes": {},
    },
    "usopp": {
        "merge": "merge-usopp",
        "indices": [0, 4, 9, 10, 11, 12, 13, 14, 16, 17, 19, 20, 21, 24, 31, 33, 35],
        "notes": {},
    },
}


def load_gltf(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def mesh_rows(data: dict) -> list[dict]:
    accessors = data.get("accessors", [])
    materials = data.get("materials", [])
    rows = []
    for i, mesh in enumerate(data.get("meshes", [])):
        prim = mesh["primitives"][0]
        attrs = prim.get("attributes", {})
        pos = attrs.get("POSITION")
        verts = accessors[pos]["count"] if pos is not None else None
        joints = attrs.get("JOINTS_0")
        weights = attrs.get("WEIGHTS_0")
        mat_i = prim.get("material")
        mat_name = materials[mat_i]["name"] if mat_i is not None and mat_i < len(materials) else ""
        rows.append(
            {
                "index": i,
                "name": mesh.get("name", ""),
                "verts": verts,
                "skinned": joints is not None and weights is not None,
                "material": mat_name or (f"#{mat_i}" if mat_i is not None else ""),
            }
        )
    return rows


def anim_names(data: dict) -> list[str]:
    return [a.get("name", f"anim_{i}") for i, a in enumerate(data.get("animations", []))]


def audit_one(key: str) -> dict:
    cfg = HIDES[key]
    merge = VAL / cfg["merge"]
    gltf = merge / "merged.gltf"
    if not gltf.exists():
        return {"character": key, "error": f"missing {gltf}"}
    data = load_gltf(gltf)
    rows = {r["index"]: r for r in mesh_rows(data)}
    hidden = []
    for idx in cfg["indices"]:
        row = rows.get(idx)
        hidden.append(
            {
                "index": idx,
                "name": row["name"] if row else "(missing)",
                "verts": row["verts"] if row else None,
                "skinned": row["skinned"] if row else None,
                "material": row["material"] if row else "",
                "why_hidden": cfg["notes"].get(idx, "Owner hide list (provisional presentation)"),
                "safe_to_hide": "unknown — needs solo-mesh visual + clip proof",
            }
        )
    return {
        "character": key,
        "source": str(gltf.relative_to(ROOT)).replace("\\", "/"),
        "total_meshes": len(rows),
        "shown_count": len(rows) - len(cfg["indices"]),
        "hidden_count": len(cfg["indices"]),
        "clips": anim_names(data),
        "hidden": hidden,
        "all_meshes": [rows[i] for i in sorted(rows)],
    }


def main() -> int:
    out_dir = ROOT / "reports"
    out_dir.mkdir(exist_ok=True)
    reports = [audit_one(k) for k in ("sanji", "nami", "usopp")]
    md = ["# Mesh hide audit (provisional)", "", "Hide preset remains the runtime default. Show All is diagnostic only.", ""]
    for rep in reports:
        md.append(f"## {rep['character'].title()}")
        if "error" in rep:
            md.append(rep["error"])
            md.append("")
            continue
        md.append(f"- Source: `{rep['source']}`")
        md.append(f"- Meshes: {rep['total_meshes']} total · {rep['shown_count']} shown · {rep['hidden_count']} hidden")
        md.append(f"- Clips: {', '.join(f'`{c}`' for c in rep['clips'])}")
        md.append("")
        md.append("| Index | Name | Verts | Skinned | Material | Why hidden | Safe? |")
        md.append("|------:|------|------:|:-------:|----------|------------|-------|")
        for h in rep["hidden"]:
            md.append(
                f"| {h['index']} | {h['name']} | {h['verts']} | {h['skinned']} | {h['material']} | {h['why_hidden']} | {h['safe_to_hide']} |"
            )
        md.append("")
        if rep["character"] == "sanji":
            md.append("### Sanji mesh 10")
            ten = next((h for h in rep["hidden"] if h["index"] == 10), None)
            if ten:
                md.append(
                    f"Noesis mesh 10 has **{ten['verts']}** verts, skinned={ten['skinned']}. "
                    "Earlier material work mapped it to cloth slot 10 because the GLB twin is a different 211-vert face piece. "
                    "Owner hide removed the bad deformation from presentation; **do not treat hide as a geometry repair**. "
                    "Restore only after Blender/weight/UV proof, not by flipping Show All in demos."
                )
            md.append("")
    path = out_dir / "MESH_HIDE_AUDIT.md"
    path.write_text("\n".join(md) + "\n", encoding="utf-8")
    json_path = out_dir / "mesh_hide_audit.json"
    # Keep all_meshes out of the committed json if huge — include hidden + summary only.
    slim = []
    for rep in reports:
        if "error" in rep:
            slim.append(rep)
            continue
        slim.append({k: v for k, v in rep.items() if k != "all_meshes"})
    json_path.write_text(json.dumps(slim, indent=2), encoding="utf-8")
    print(f"Wrote {path}")
    print(f"Wrote {json_path}")
    for rep in reports:
        if "error" in rep:
            print(rep)
        else:
            print(rep["character"], "hidden", rep["hidden_count"], "clips", rep["clips"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
