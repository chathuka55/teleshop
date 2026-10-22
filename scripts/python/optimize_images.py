#!/usr/bin/env python3
"""Convert product images to web-ready WebP files (metadata stripped).

Usage:
    python optimize_images.py --src output/raw --out output/web
Produces <name>-<width>.webp for each width in config.WEB_WIDTHS.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps

import config

INPUT_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def convert(path: Path, out_dir: Path) -> list[Path]:
    written: list[Path] = []
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)          # apply rotation, then drop EXIF
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        for width in config.WEB_WIDTHS:
            copy = im.copy()
            if copy.width > width:
                copy.thumbnail((width, width * 10), Image.LANCZOS)
            target = out_dir / f"{path.stem}-{width}.webp"
            copy.save(target, "WEBP", quality=config.WEBP_QUALITY, method=6)  # no exif= → metadata stripped
            written.append(target)
    return written


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", default=Path("output/raw"), type=Path)
    ap.add_argument("--out", default=Path("output/web"), type=Path)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    files = [p for p in sorted(args.src.iterdir()) if p.suffix.lower() in INPUT_EXT]
    total = 0
    for p in files:
        out = convert(p, args.out)
        total += len(out)
        print(f"- {p.name} -> {', '.join(o.name for o in out)}")
    print(f"Wrote {total} file(s) to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
