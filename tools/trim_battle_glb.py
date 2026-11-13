"""
Build slim battle GLBs under private-assets/glb/ from Blender_Models (or another source).

Keeps only the named clips the game uses. Drop the numbered bulk library so file size stays small.

Examples:
  python tools/trim_battle_glb.py zoro
  python tools/trim_battle_glb.py zoro --src D:\\Projects\\OnePieceGame\\Blender_Models\\Zoro.glb
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLENDER = Path(r"D:\blender\blender.exe")
SCRIPT = ROOT / "tools" / "glb_trim_battle_anims.py"
OUT_DIR = ROOT / "private-assets" / "glb"
REPORT_DIR = OUT_DIR / "reports"

# Named battle clips only (not the full Zoro_#### library).
CHARACTERS: dict[str, dict] = {
    "zoro": {
        "src": Path(r"D:\Projects\OnePieceGame\Blender_Models\Zoro.glb"),
        "dst": OUT_DIR / "zoro.glb",
        "keep": [
            "Idle",
            "Attack",
            "Onigiri",
            "Dragon_Twister",
            "Asura_Central",
            "Asura_Left",
            "Asura_right",
            "Block",
            "Hit",
            "Death",
        ],
        "hidden_json": Path(r"D:\Projects\OnePieceGame\Blender_Models\Zoro_hidden_meshes.json"),
    },
    "sanji": {
        "src": Path(r"D:\Projects\OnePieceGame\Blender_Models\Sanji\Sanji.glb"),
        "dst": OUT_DIR / "sanji.glb",
        "keep": [
            "Idle",
            "Attack",
            "Block",
            "Hit",
            "Death",
            "Diable_Jambe_1",
            "Diable_Jambe_2",
            "Diable_Jambe_3",
            "Diable_Jambe_4",
            "Party_Table_Kick_Course_1",
            "Party_Table_Kick_Course_2",
            "Party_Table_Kick_Course_3",
        ],
        "hidden_json": Path(r"D:\Projects\OnePieceGame\Blender_Models\Sanji\Sanji_hidden_meshes.json"),
    },
    "nami": {
        "src": Path(r"D:\Projects\OnePieceGame\Blender_Models\Nami\Nami.glb"),
        "dst": OUT_DIR / "nami.glb",
        "keep": [
            "Idle",
            "Attack",
            "Block",
            "Hit",
            "Death",
            "Thunderbolt_Tempo",
            "Cyclone_Tempo",
        ],
        "hidden_json": Path(r"D:\Projects\OnePieceGame\Blender_Models\Nami\Nami_hidden_meshes.json"),
    },
    "usopp": {
        "src": Path(r"D:\Projects\OnePieceGame\Blender_Models\Usopp\Usopp.glb"),
        "dst": OUT_DIR / "usopp.glb",
        "keep": [
            "Idle",
            "Attack",
            "Block",
            "Hit",
            "Death",
            "Fire_Star",
            "Sunflower_Star",
        ],
        "hidden_json": Path(r"D:\Projects\OnePieceGame\Blender_Models\Usopp\Usopp_hidden_meshes.json"),
    },
    "ace": {
        "src": Path(r"D:\Projects\OnePieceGame\Blender_Models\Ace\Ace.glb"),
        "dst": OUT_DIR / "ace.glb",
        "keep": [
            "Idle",
            "Attack",
            "Block",
            "Hit",
            "Death",
            "Fire_Fist",
            "Flame_Emperor",
        ],
        "hidden_json": Path(r"D:\Projects\OnePieceGame\Blender_Models\Ace\Ace_hidden_meshes.json"),
    },
    "brook": {
        "src": Path(r"D:\Projects\OnePieceGame\Blender_Models\Brook\Brook.glb"),
        "dst": OUT_DIR / "brook.glb",
        "keep": [
            "Idle",
            "Attack",
            "Block",
            "Hit",
            "Death",
            "Arrow_Notch",
            "Polka_Remise",
        ],
        "hidden_json": Path(r"D:\Projects\OnePieceGame\Blender_Models\Brook\Brook_hidden_meshes.json"),
    },
    "chopper": {
        "src": Path(r"D:\Projects\OnePieceGame\Blender_Models\Chopper\Chopper.glb"),
        "dst": OUT_DIR / "chopper.glb",
        "keep": [
            "Idle",
            "Attack",
            "Block",
            "Hit",
            "Death",
            "Cure",
            "Im_A_Doctor",
        ],
        "hidden_json": Path(r"D:\Projects\OnePieceGame\Blender_Models\Chopper\Chopper_hidden_meshes.json"),
    },
    "robin": {
        "src": Path(r"D:\Projects\OnePieceGame\Blender_Models\Robin\Robin.glb"),
        "dst": OUT_DIR / "robin.glb",
        "keep": [
            "Idle",
            "Attack",
            "Block",
            "Hit",
            "Death",
            "Rondo",
            "Clutch_1",
            "Clutch_2",
            "Clutch_3",
            "Clutch_4",
            "Clutch_5",
            "Clutch_6",
            "Clutch_7",
        ],
        "hidden_json": Path(r"D:\Projects\OnePieceGame\Blender_Models\Robin\Robin_hidden_meshes.json"),
    },
    "franky": {
        "src": Path(r"D:\Projects\OnePieceGame\Blender_Models\Franky\Franky.glb"),
        "dst": OUT_DIR / "franky.glb",
        "keep": [
            "Idle",
            "Attack",
            "Block",
            "Hit",
            "Death",
            "Radical_Beam_1",
            "Radical_Beam_2",
            "Strong_Right",
        ],
        "hidden_json": Path(r"D:\Projects\OnePieceGame\Blender_Models\Franky\Franky_hidden_meshes.json"),
    },
    "luffy": {
        "src": Path(r"D:\Projects\OnePieceGame\Blender_Models\Luffy\Luffy.glb"),
        "dst": OUT_DIR / "luffy.glb",
        "keep": [
            "Idle",
            "Attack",
            "Block",
            "Hit",
            "Death",
            "Bazooka",
            "Gattling",
        ],
        "hidden_json": Path(r"D:\Projects\OnePieceGame\Blender_Models\Luffy\Luffy_hidden_meshes.json"),
    },
}


def run(character: str, src: Path | None) -> int:
    cfg = CHARACTERS[character]
    source = src or cfg["src"]
    dst: Path = cfg["dst"]
    keep: list[str] = cfg["keep"]
    hidden = cfg.get("hidden_json")
    report = REPORT_DIR / f"trim-{character}.json"

    if not BLENDER.exists():
        print(f"missing Blender: {BLENDER}", file=sys.stderr)
        return 2
    if not source.exists():
        print(f"missing source: {source}", file=sys.stderr)
        return 2

    cmd = [
        str(BLENDER),
        "--background",
        "--python",
        str(SCRIPT),
        "--",
        "--src",
        str(source),
        "--dst",
        str(dst),
        "--keep",
        ",".join(keep),
        "--report",
        str(report),
    ]
    if hidden and Path(hidden).exists():
        cmd.extend(["--hidden-json", str(hidden)])

    print(" ".join(cmd))
    proc = subprocess.run(cmd, cwd=str(ROOT))
    if proc.returncode != 0:
        return proc.returncode
    if report.exists():
        payload = json.loads(report.read_text(encoding="utf-8"))
        print(
            f"{character}: {payload.get('actions_before')} -> {len(payload.get('actions_after', []))} clips, "
            f"{payload.get('size_bytes', 0)} bytes -> {dst}"
        )
        if payload.get("status") != "OK":
            return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("character", choices=sorted(CHARACTERS), help="Character key to trim")
    parser.add_argument("--src", type=Path, default=None, help="Override source GLB path")
    args = parser.parse_args()
    return run(args.character, args.src)


if __name__ == "__main__":
    raise SystemExit(main())
