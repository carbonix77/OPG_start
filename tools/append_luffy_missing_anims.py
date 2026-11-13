"""
Append missing Luffy body animations into Blender_Models/Luffy/Luffy.blend.

- Does not modify meshes, materials, images, or existing actions (Idle/Attack/Bazooka kept).
- Builds Noesis merge batches of missing G1As, packs temp GLBs, imports actions only.

Usage:
  python tools/append_luffy_missing_anims.py
  python tools/append_luffy_missing_anims.py --batch-size 40 --max-batches 0
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLENDER = Path(r"D:\blender\blender.exe")
BLEND = Path(r"D:\Projects\OnePieceGame\Blender_Models\Luffy\Luffy.blend")
SPELLS = ROOT / "Luffy" / "spells"
G1M = ROOT / "Luffy" / "model" / "MPLC000_Luffy.g1m"
OID = ROOT / "Luffy" / "model" / "MPLC000_Luffy.oid"
WORK = ROOT / "private-assets" / "validation" / "luffy-missing-batches"
REPORT = ROOT / "private-assets" / "glb" / "reports" / "luffy-append-missing.json"
BLEND_SCRIPT = ROOT / "tools" / "_luffy_append_actions_blend.py"

# Custom names in the blend that already cover these source clips — do not re-add.
ALIASES = {
    "Idle": "Luffy_0000",
    "Attack": "Luffy_0500",
    "Bazooka": "Luffy_1310",
}


def load_build_mod():
    spec = importlib.util.spec_from_file_location("build_full_anim_glb", ROOT / "tools" / "build_full_anim_glb.py")
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def body_g1a_stems() -> list[Path]:
    out: list[Path] = []
    for p in SPELLS.glob("*.g1a"):
        if not p.name.startswith("Luffy_"):
            continue
        if "camera" in p.name.lower():
            continue
        if "_w." in p.name.lower() or p.name.lower().endswith("_w.g1a"):
            continue
        if p.stat().st_size < 2048:
            continue
        out.append(p)
    return sorted(out, key=lambda p: p.name)


def current_blend_actions() -> set[str]:
    # Lightweight: read from prior audit if fresh, else ask Blender.
    audit = ROOT / "private-assets" / "glb" / "reports" / "luffy-anim-audit.json"
    if audit.exists():
        data = json.loads(audit.read_text(encoding="utf-8"))
        return set(data.get("blend_actions") or [])
    raise SystemExit("run inspect first or ensure audit json exists")


def covered_stems(present: set[str]) -> set[str]:
    covered = set(present)
    for custom, src in ALIASES.items():
        if custom in present:
            covered.add(src)
    return covered


def stage_batch(batch_idx: int, files: list[Path]) -> Path:
    merge = WORK / f"batch_{batch_idx:03d}"
    if merge.exists():
        shutil.rmtree(merge)
    merge.mkdir(parents=True)
    shutil.copy2(G1M, merge / G1M.name)
    shutil.copy2(OID, merge / OID.name)
    for g1a in files:
        shutil.copy2(g1a, merge / g1a.name)
    return merge


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch-size", type=int, default=40)
    parser.add_argument("--max-batches", type=int, default=0, help="0 = all batches")
    parser.add_argument("--skip-noesis", action="store_true", help="Only append already-built batch GLBs")
    parser.add_argument("--append-only", action="store_true", help="Skip staging/export; append existing batch_*.glb")
    args = parser.parse_args()

    if not BLEND.exists():
        raise SystemExit(f"missing blend: {BLEND}")
    if not SPELLS.exists():
        raise SystemExit(f"missing spells: {SPELLS}")

    present = current_blend_actions()
    covered = covered_stems(present)
    all_body = body_g1a_stems()
    missing = [p for p in all_body if p.stem not in covered]
    print(f"blend actions: {len(present)}")
    print(f"body g1a: {len(all_body)}")
    print(f"missing: {len(missing)}")
    print(f"protected customs: {[n for n in ALIASES if n in present]}")

    WORK.mkdir(parents=True, exist_ok=True)
    batches: list[list[Path]] = []
    for i in range(0, len(missing), args.batch_size):
        batches.append(missing[i : i + args.batch_size])
    if args.max_batches > 0:
        batches = batches[: args.max_batches]
    print(f"batches: {len(batches)} x ~{args.batch_size}")

    mod = load_build_mod()
    batch_glbs: list[Path] = []

    if not args.append_only:
        for bi, files in enumerate(batches):
            merge = stage_batch(bi, files)
            print(f"=== batch {bi}: {len(files)} clips → {merge}", flush=True)
            if args.skip_noesis:
                gltf = merge / "merged.gltf"
                if not gltf.exists():
                    raise SystemExit(f"missing {gltf}")
            else:
                gltf = mod.noesis_export(merge, G1M.name)
            glb = WORK / f"batch_{bi:03d}.glb"
            anims = mod.pack_gltf_to_glb(gltf, glb)
            print(f"  packed {glb.name}: {len(anims)} anims, {glb.stat().st_size} bytes", flush=True)
            batch_glbs.append(glb)
    else:
        batch_glbs = sorted(WORK.glob("batch_*.glb"))
        print(f"append-only: {len(batch_glbs)} glbs", flush=True)

    if not batch_glbs:
        print("nothing to append")
        return 0

    if not BLENDER.exists():
        raise SystemExit(f"missing Blender: {BLENDER}")
    if not BLEND_SCRIPT.exists():
        raise SystemExit(f"missing {BLEND_SCRIPT}")

    list_path = WORK / "batch_glb_list.json"
    list_path.write_text(json.dumps([str(p) for p in batch_glbs], indent=2), encoding="utf-8")
    cmd = [
        str(BLENDER),
        "--background",
        "--python",
        str(BLEND_SCRIPT),
        "--",
        "--blend",
        str(BLEND),
        "--glb-list",
        str(list_path),
        "--report",
        str(REPORT),
        "--protect",
        ",".join(sorted(present)),
    ]
    print(" ".join(cmd), flush=True)
    proc = subprocess.run(cmd, cwd=str(ROOT))
    if proc.returncode != 0:
        return proc.returncode
    if REPORT.exists():
        print(REPORT.read_text(encoding="utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
