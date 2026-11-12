"""
Export local per-character GLBs with the owner-authorized Blender at D:\\blender\\blender.exe.

Outputs (gitignored):
  private-assets/glb/{zoro,sanji,nami,usopp}.glb
  private-assets/glb/reports/{character}.json
  reports/GLB_EXPORT_MATRIX.md  (text-only summary committed)

Does not modify game installs. Does not commit binaries.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLENDER = Path(r"D:\blender\blender.exe")
SCRIPT = ROOT / "tools" / "blender_export_character.py"
OUT_DIR = ROOT / "private-assets" / "glb"
REPORT_DIR = OUT_DIR / "reports"

CHARACTERS = {
    "zoro": {
        "gltf": ROOT / "private-assets/validation/merge-roster/merged.gltf",
        "textures": ROOT / "preview/textures/zoro",
        "slots": ROOT / "tools/glb_slots/zoro.json",
        "expected": ["Zoro_0000", "Zoro_0500", "Zoro_0650", "Zoro_1330", "Zoro_1320", "Zoro_0060", "Zoro_0061"],
        "phantom_note": "Zoro_1322/1324 are included in the roster GLB when present in merged.gltf.",
    },
    "sanji": {
        "gltf": ROOT / "private-assets/validation/merge-sanji/merged.gltf",
        "textures": ROOT / "preview/textures/sanji",
        "slots": ROOT / "tools/glb_slots/sanji.json",
        "expected": ["Sanji_0000", "Sanji_0500", "Sanji_1290", "Sanji_1300", "Sanji_1310", "Sanji_1330"],
        "phantom_note": "",
    },
    "nami": {
        "gltf": ROOT / "private-assets/validation/merge-nami/merged.gltf",
        "textures": ROOT / "preview/textures/nami",
        "slots": ROOT / "tools/glb_slots/nami.json",
        "expected": ["Nami_0000", "Nami_NewWorld_0500", "Nami_NewWorld_1300"],
        "phantom_note": "",
    },
    "usopp": {
        "gltf": ROOT / "private-assets/validation/merge-usopp/merged.gltf",
        "textures": ROOT / "preview/textures/usopp",
        "slots": ROOT / "tools/glb_slots/usopp.json",
        "expected": ["Usopp_0000", "Usopp_0500", "Usopp_1300"],
        "phantom_note": "",
    },
}


def source_action_names(gltf_path: Path) -> list[str]:
    data = json.loads(gltf_path.read_text(encoding="utf-8"))
    return [anim.get("name", f"anim_{i}") for i, anim in enumerate(data.get("animations", []))]


def run_one(name: str) -> dict:
    cfg = CHARACTERS[name]
    gltf = cfg["gltf"]
    if not gltf.exists():
        return {"character": name, "ok": False, "error": f"missing {gltf}"}
    out = OUT_DIR / f"{name}.glb"
    report = REPORT_DIR / f"{name}.json"
    map_path = cfg["textures"] / "map.json"
    cmd = [
        str(BLENDER),
        "--background",
        "--python",
        str(SCRIPT),
        "--",
        "--character",
        name,
        "--gltf",
        str(gltf),
        "--out",
        str(out),
        "--report",
        str(report),
        "--textures",
        str(cfg["textures"]),
        "--map",
        str(map_path),
        "--slots",
        str(cfg["slots"]),
        "--mode",
        "ACTIONS",
    ]
    print("RUN", " ".join(cmd), flush=True)
    proc = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
    payload = {
        "character": name,
        "returncode": proc.returncode,
        "stdout_tail": proc.stdout[-2000:],
        "stderr_tail": proc.stderr[-2000:],
        "source_actions": source_action_names(gltf),
        "expected": cfg["expected"],
        "phantom_note": cfg["phantom_note"],
    }
    if report.exists():
        payload["blender"] = json.loads(report.read_text(encoding="utf-8"))
    missing_expected = [clip for clip in cfg["expected"] if clip not in payload["source_actions"]]
    payload["missing_from_source"] = missing_expected
    if "blender" in payload:
        glb_actions = payload["blender"].get("glb_reimport", {}).get("actions", [])
        payload["missing_from_glb"] = [clip for clip in cfg["expected"] if clip not in glb_actions]
        if name == "zoro":
            payload["phantoms_in_source"] = [c for c in ("Zoro_1322", "Zoro_1324") if c in payload["source_actions"]]
            payload["phantoms_in_glb"] = [c for c in ("Zoro_1322", "Zoro_1324") if c in glb_actions]
        status = payload["blender"].get("status", "FAIL")
        if payload["missing_from_glb"]:
            status = "FAIL"
        payload["status"] = status
        payload["ok"] = status == "PASS"
        payload["clips_ok"] = payload["blender"].get("clips_ok", False) and not payload["missing_from_glb"]
    else:
        payload["status"] = "FAIL"
        payload["ok"] = False
        payload["clips_ok"] = False
        payload["missing_from_glb"] = list(cfg["expected"])
    summary = REPORT_DIR / f"{name}.summary.json"
    summary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return payload


def write_matrix(rows: list[dict]) -> Path:
    lines = [
        "# GLB export matrix (local files)",
        "",
        "Blender: `D:\\\\blender\\\\blender.exe` (owner-authorized, 5.2.2 LTS). Binaries stay under ignored `private-assets/glb/`.",
        "",
        "Status: **PASS** = clips + mesh-bound textures · **PARTIAL** = clips OK, textures incomplete · **FAIL** = missing clips/file.",
        "",
        "| Character | Status | Size | Clips src→glb | Missing | Bones | Meshes | Tex meshes | Images |",
        "|-----------|:------:|-----:|--------------:|---------|------:|-------:|-----------:|-------:|",
    ]
    for row in rows:
        blender = row.get("blender", {})
        src = blender.get("source", {})
        glb = blender.get("glb_reimport", {})
        tex = blender.get("texture_stats", {})
        size = blender.get("size_bytes", 0)
        missing = ", ".join(row.get("missing_from_glb", [])) or "—"
        status = row.get("status", "FAIL")
        lines.append(
            f"| {row['character']} | {status} | {size} | {src.get('action_count', '?')}→{glb.get('action_count', '?')} | {missing} | "
            f"{src.get('bones', '?')}→{glb.get('bones', '?')} | {src.get('meshes', '?')}→{glb.get('meshes', '?')} | "
            f"{tex.get('meshes', blender.get('textures_applied', '?'))} | {glb.get('images', '?')} |"
        )
        if row["character"] == "zoro":
            lines.append("")
            lines.append(
                f"- Zoro phantoms in source: {row.get('phantoms_in_source', [])}; in GLB: {row.get('phantoms_in_glb', [])}."
            )
    lines += [
        "",
        "## Notes",
        "- Textures are reconstructed from local decoded PNG + `map.json` / mesh slots (not authenticated original shading).",
        "- Full geometry retained; Babylon hide preset remains reversible presentation.",
        "- Re-run: `python tools/export_all_characters.py`",
        "",
    ]
    path = ROOT / "reports" / "GLB_EXPORT_MATRIX.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def main() -> int:
    if not BLENDER.exists():
        print(f"Blender missing at {BLENDER}", file=sys.stderr)
        return 1
    version = subprocess.run([str(BLENDER), "--version"], capture_output=True, text=True)
    print(version.stdout.splitlines()[0] if version.stdout else version.stderr)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    names = sys.argv[1:] or list(CHARACTERS)
    rows = [run_one(name.lower()) for name in names]
    matrix = write_matrix(rows)
    clips_ok = all(row.get("clips_ok") for row in rows)
    print(f"Wrote {matrix}; clips_ok={clips_ok}")
    for row in rows:
        print(row["character"], row.get("status"), row.get("missing_from_glb"))
    # Exit 0 when clips validate even if textures are PARTIAL — report honesty separately.
    return 0 if clips_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
