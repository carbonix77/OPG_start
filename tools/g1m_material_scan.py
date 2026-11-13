"""Offline string scan of a local G1M for texture/material name clues.

Uses only the Python stdlib. Does not install tools, inject, or modify the game.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

NEEDLES = [
    b"cloth",
    b"weapon",
    b"weapon00",
    b"weapon01",
    b"weapon02",
    b"weapon03",
    b"weapon04",
    b"skin",
    b"hair",
    b"face",
    b"kidsalb",
    b"kidsnmh",
]


def ascii_hits(blob: bytes) -> list[str]:
    found: list[str] = []
    for needle in NEEDLES:
        if needle in blob:
            found.append(needle.decode("ascii"))
    return found


def printable_runs(blob: bytes, minimum: int = 4) -> list[str]:
    return [m.group(0).decode("ascii") for m in re.finditer(rb"[ -~]{%d,}" % minimum, blob)]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("g1m", type=Path)
    args = parser.parse_args()
    path: Path = args.g1m
    if not path.is_file():
        print(f"missing file: {path}", file=sys.stderr)
        return 2
    blob = path.read_bytes()
    print(f"file={path}")
    print(f"bytes={len(blob)}")
    print(f"header={blob[:4]!r}")
    hits = ascii_hits(blob)
    print(f"needle_hits={hits}")
    runs = [s for s in printable_runs(blob) if any(key in s.lower() for key in ("weapon", "cloth", "kids", "mat", "tex"))]
    print(f"interesting_strings={len(runs)}")
    for item in runs[:80]:
        print(f"  {item}")
    if not hits and not runs:
        print("No embedded texture filename strings were found.")
        print("Go/no-go: no-go for recovering mesh 36 or hip sheet indices from this G1M alone.")
        return 0
    if "weapon" in hits or any("weapon" in s.lower() for s in runs):
        print("Texture-family strings exist, but there is still no mesh-index-to-sheet table.")
    print("Go/no-go: no-go unless a recovered index table appears; keep provisional mouth/hip treatment.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
