"""Copy Noesis merge + textures into ignored private-assets/blender/<char>/ packages."""
from __future__ import annotations

import json
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

CHARACTERS = {
    "sanji": {
        "merge": ROOT / "private-assets/validation/merge-sanji",
        "textures": ROOT / "preview/textures/sanji",
        "excluded": [0, 5, 6, 7, 10, 12, 24],
        "materialSlotByMesh": [
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 10, 13, 14, 15, 16, 17, 18, 21, 20, 19, 22, 22, 23, 23, 24, 25, 26, 27, 28, 29,
        ],
        "clips": ["Sanji_0000", "Sanji_0500", "Sanji_1290", "Sanji_1300", "Sanji_1310", "Sanji_1330"],
    },
    "nami": {
        "merge": ROOT / "private-assets/validation/merge-nami",
        "textures": ROOT / "preview/textures/nami",
        "excluded": [4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 18, 20, 23],
        "materialSlotByMesh": list(range(24)),
        "clips": ["Nami_0000", "Nami_NewWorld_0500", "Nami_NewWorld_1300"],
    },
    "usopp": {
        "merge": ROOT / "private-assets/validation/merge-usopp",
        "textures": ROOT / "preview/textures/usopp",
        "excluded": [0, 4, 9, 10, 11, 12, 13, 14, 16, 17, 19, 20, 21, 24, 31, 33, 35],
        "materialSlotByMesh": list(range(37)),
        "clips": ["Usopp_0000", "Usopp_0500", "Usopp_1300"],
    },
    "zoro": {
        "merge": ROOT / "private-assets/validation/merge-roster",
        "textures": ROOT / "preview/textures/zoro",
        "excluded": [2],
        "materialSlotByMesh": None,
        "clips": ["Zoro_0000", "Zoro_0500", "Zoro_0650", "Zoro_1330", "Zoro_1320", "Zoro_0060", "Zoro_0061"],
    },
}


def copy_tree(src: pathlib.Path, dst: pathlib.Path) -> None:
    if not src.exists():
        raise FileNotFoundError(src)
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def prepare(name: str) -> pathlib.Path:
    if name not in CHARACTERS:
        raise SystemExit(f"Unknown character {name}. Choose: {', '.join(CHARACTERS)}")
    cfg = CHARACTERS[name]
    out = ROOT / "private-assets" / "blender" / name
    out.mkdir(parents=True, exist_ok=True)
    merge_dst = out / "merge"
    tex_dst = out / "textures"
    copy_tree(cfg["merge"], merge_dst)
    if cfg["textures"].exists():
        copy_tree(cfg["textures"], tex_dst)
    else:
        tex_dst.mkdir(exist_ok=True)
        (tex_dst / "MISSING.txt").write_text(f"No textures at {cfg['textures']}\n", encoding="utf-8")
    (out / "excludedMeshIndices.json").write_text(json.dumps(cfg["excluded"], indent=2) + "\n", encoding="utf-8")
    slots = cfg["materialSlotByMesh"]
    (out / "materialSlotByMesh.json").write_text(
        json.dumps(slots if slots is not None else {"note": "use map.json / Material_N"}, indent=2) + "\n",
        encoding="utf-8",
    )
    (out / "SOURCE.txt").write_text(
        "\n".join(
            [
                f"character: {name}",
                f"merge_source: {cfg['merge'].relative_to(ROOT).as_posix()}",
                f"texture_source: {cfg['textures'].relative_to(ROOT).as_posix()}",
                f"clips: {', '.join(cfg['clips'])}",
                f"excludedMeshIndices: {cfg['excluded']}",
                "Do not commit this folder. Round-trip notes go in ROUNDTRIP.md after Blender is authorized.",
                "",
            ]
        ),
        encoding="utf-8",
    )
    roundtrip = out / "ROUNDTRIP.md"
    if not roundtrip.exists():
        roundtrip.write_text(
            "\n".join(
                [
                    f"# {name.title()} Blender round trip",
                    "",
                    "- Blender version:",
                    "- Import OK (skeleton/meshes/clips):",
                    "- Export mode (Actions vs NLA):",
                    "- Re-import bone count / clip names:",
                    "- Babylon load notes:",
                    "- Screenshots (local paths only):",
                    "- Stop reason if failed:",
                    "",
                ]
            ),
            encoding="utf-8",
        )
    print(f"Prepared {out}")
    return out


def main() -> int:
    args = sys.argv[1:] or ["sanji"]
    for name in args:
        prepare(name.lower())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
