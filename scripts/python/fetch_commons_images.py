#!/usr/bin/env python3
"""Find and download freely licensed product photos from Wikimedia Commons (docs/07).

Two stages, so a person picks every image before it ships:

    # 1. search: up to N licensed candidates per product + contact sheets to review
    python fetch_commons_images.py search --queries input/commons-queries.csv --out output/commons

    # 2. fetch: download the chosen file per product, re-encode to WebP, write credits
    python fetch_commons_images.py fetch --picks input/commons-picks.csv \
        --out ../../public/images/products --credits ../../src/config/product-image-credits.ts

Rules enforced:
  * only the Wikimedia API + Commons' own CDNs (upload./thumb.wikimedia.org), https only
  * only licences that allow commercial reuse: CC0, public domain, CC BY, CC BY-SA
  * one request at a time with a delay, and a User-Agent with contact details (Wikimedia policy)
  * author, licence and source page are recorded for every image (attribution is required)
"""
from __future__ import annotations

import argparse
import csv
import html
import io
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import requests
from PIL import Image, ImageDraw, ImageOps

import config

API = "https://commons.wikimedia.org/w/api.php"
ALLOWED_HOSTS = {"commons.wikimedia.org", "upload.wikimedia.org", "thumb.wikimedia.org"}
USER_AGENT = "TeleshopImageFetcher/1.0 (https://teleshop-mu.vercel.app/contact; chathuka500@gmail.com)"
LICENCE_OK = re.compile(r"^(CC0|Public domain|PD|CC BY(-SA)? \d(\.\d)?)", re.IGNORECASE)
RASTER = {"image/jpeg", "image/png", "image/webp"}
FETCH_WIDTH = 1200
OUT_MAX = 1000

_session = requests.Session()
_session.headers["User-Agent"] = USER_AGENT
_last = 0.0


def get(url: str, **params: str) -> requests.Response:
    global _last
    host = urlparse(url).hostname or ""
    if urlparse(url).scheme != "https" or host not in ALLOWED_HOSTS:
        raise ValueError(f"refusing non-Commons URL: {url}")
    wait = config.REQUEST_DELAY_SECONDS / 2 - (time.monotonic() - _last)
    if wait > 0:
        time.sleep(wait)
    for attempt in range(3):
        try:
            r = _session.get(url, params=params or None, timeout=config.TIMEOUT_SECONDS)
            _last = time.monotonic()
            if r.status_code == 429:
                time.sleep(5 * (attempt + 1))
                continue
            r.raise_for_status()
            return r
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(3)
    raise RuntimeError("unreachable")


def strip_html(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", value or "")).strip()


def search(query: str, limit: int) -> list[dict]:
    r = get(
        API,
        action="query",
        format="json",
        generator="search",
        gsrnamespace="6",
        gsrsearch=f"{query} filetype:bitmap",
        gsrlimit="20",
        prop="imageinfo",
        iiprop="url|extmetadata|size|mime",
        iiurlwidth=str(FETCH_WIDTH),
    )
    pages = sorted(r.json().get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
    out: list[dict] = []
    for p in pages:
        ii = (p.get("imageinfo") or [{}])[0]
        meta = ii.get("extmetadata", {})
        licence = strip_html(meta.get("LicenseShortName", {}).get("value", ""))
        if ii.get("mime") not in RASTER or not LICENCE_OK.match(licence):
            continue
        if min(ii.get("width", 0), ii.get("height", 0)) < 500:
            continue
        out.append(
            {
                "title": p["title"],
                "thumb": ii.get("thumburl") or ii["url"],
                "page": ii.get("descriptionurl", ""),
                "licence": licence,
                "licenceUrl": meta.get("LicenseUrl", {}).get("value", ""),
                "author": strip_html(meta.get("Artist", {}).get("value", "")) or "Unknown",
            }
        )
        if len(out) >= limit:
            break
    return out


def preview_url(thumb: str) -> str:
    """Small (330 px, a standard Wikimedia step) version of a thumbnail URL for contact sheets."""
    return re.sub(r"/\d+px-", "/330px-", thumb, count=1)


def contact_sheet(rows: list[tuple[str, list[dict]]], path: Path) -> None:
    """One row per product: slug + numbered candidate thumbnails."""
    cell, label_w = 220, 260
    sheet = Image.new("RGB", (label_w + cell * 6, cell * len(rows)), "white")
    draw = ImageDraw.Draw(sheet)
    for r, (slug, cands) in enumerate(rows):
        y = r * cell
        draw.text((8, y + cell // 2 - 6), slug, fill="black")
        for i, c in enumerate(cands):
            try:
                img = Image.open(io.BytesIO(get(preview_url(c["thumb"])).content)).convert("RGB")
            except Exception as e:
                print(f"  ! preview failed for {c['title']}: {e}", file=sys.stderr)
                continue
            img = ImageOps.contain(img, (cell - 10, cell - 26))
            x = label_w + i * cell
            sheet.paste(img, (x + 5, y + 20))
            draw.text((x + 5, y + 4), str(i + 1), fill="red")
        draw.line([(0, y + cell - 1), (sheet.width, y + cell - 1)], fill="#cccccc")
    sheet.save(path, quality=80)


def cmd_search(args: argparse.Namespace) -> int:
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    with open(args.queries, newline="", encoding="utf-8") as f:
        queries = list(csv.DictReader(f))
    results: dict[str, list[dict]] = {}
    for q in queries:
        results[q["slug"]] = search(q["query"], args.limit)
        print(f"{q['slug']}: {len(results[q['slug']])} candidates", flush=True)
    (out / "candidates.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    write_sheets(results, out, args.per_sheet)
    return 0


def write_sheets(results: dict[str, list[dict]], out: Path, per_sheet: int) -> None:
    slugs = list(results)
    for n, start in enumerate(range(0, len(slugs), per_sheet), 1):
        chunk = [(s, results[s]) for s in slugs[start : start + per_sheet]]
        contact_sheet(chunk, out / f"sheet-{n}.jpg")
        print(f"wrote sheet-{n}.jpg", flush=True)


def load_image(data: bytes) -> Image.Image:
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data)))  # apply rotation; EXIF is not re-saved
    return img.convert("RGBA") if img.mode in ("P", "LA", "RGBA") else img.convert("RGB")


def cmd_fetch(args: argparse.Namespace) -> int:
    """Download every chosen candidate (picks: `slug,choices` with e.g. "4 3 5", 0 = none)."""
    raw = Path(args.raw)
    raw.mkdir(parents=True, exist_ok=True)
    candidates = json.loads(Path(args.candidates).read_text(encoding="utf-8"))
    with open(args.picks, newline="", encoding="utf-8") as f:
        picks = list(csv.DictReader(f))
    manifest = []
    for p in picks:
        slug = p["slug"]
        choices = [int(x) for x in p["choices"].split() if int(x) > 0]
        if not choices:
            print(f"{slug}: skipped (no suitable image)")
            continue
        for n, choice in enumerate(choices, 1):
            c = candidates[slug][choice - 1]
            name = f"{slug}-{n}"
            load_image(get(c["thumb"]).content).save(raw / f"{name}.png")
            manifest.append({"slug": slug, "name": name, "position": n, **c})
            print(f"{name}: {c['title']} ({c['licence']})", flush=True)
    (raw / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{len(manifest)} images -> {raw}")
    return 0


def trim_transparent(img: Image.Image, pad_ratio: float = 0.04) -> Image.Image:
    """Crop to the visible object plus a small margin, so cut-outs fill the product tile."""
    box = img.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        return img
    pad = int(max(img.size) * pad_ratio)
    l, t, r, b = box
    return img.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, img.width), min(b + pad, img.height)))


def cmd_build(args: argparse.Namespace) -> int:
    """Background removal (rembg) + WebP + credits. Names in --keep-background stay as photographed."""
    raw, out = Path(args.raw), Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((raw / "manifest.json").read_text(encoding="utf-8"))
    keep = set()
    if args.keep_background and Path(args.keep_background).exists():
        keep = {l.split("#")[0].strip() for l in Path(args.keep_background).read_text(encoding="utf-8").splitlines()}
        keep.discard("")
    session = None
    if not args.no_cutout:
        from rembg import new_session, remove  # optional dependency, only for this step

        session = new_session(args.model)
    for old in out.glob("*.webp"):
        old.unlink()  # stale files from earlier runs
    credits = []
    for m in manifest:
        img = Image.open(raw / f"{m['name']}.png")
        cut = session is not None and m["name"] not in keep
        if cut:
            img = trim_transparent(remove(img.convert("RGBA"), session=session, post_process_mask=True))
        img.thumbnail((OUT_MAX, OUT_MAX))
        img.save(out / f"{m['name']}.webp", "WEBP", quality=config.WEBP_QUALITY, method=6)
        changes = "background removed, cropped, resized, WebP" if cut else "resized, WebP"
        credits.append({**m, "file": f"/images/products/{m['name']}.webp", "width": img.width,
                        "height": img.height, "changes": changes})
        print(f"{m['name']}: {'cut-out' if cut else 'kept background'} {img.width}x{img.height}", flush=True)

    keys = ("slug", "position", "file", "width", "height", "title", "page", "author", "licence", "licenceUrl", "changes")
    lines = [
        "// Generated by scripts/python/fetch_commons_images.py (build) — do not edit by hand.",
        "// Freely licensed product photos from Wikimedia Commons; attribution is shown on /credits.",
        "",
        "export type ProductImageCredit = {",
        "  slug: string;",
        "  /** 1 = main photo */",
        "  position: number;",
        "  file: string;",
        "  width: number;",
        "  height: number;",
        "  title: string;",
        "  page: string;",
        "  author: string;",
        "  licence: string;",
        "  licenceUrl: string;",
        "  /** what we changed — CC BY/BY-SA require saying so */",
        "  changes: string;",
        "};",
        "",
        "export const productImageCredits: readonly ProductImageCredit[] = [",
    ]
    for c in credits:
        lines.append(f"  {json.dumps({k: c[k] for k in keys}, ensure_ascii=False)},")
    lines += ["];", ""]
    Path(args.credits).write_text("\n".join(lines), encoding="utf-8")
    print(f"{len(credits)} images, credits -> {args.credits}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("--queries", required=True)
    s.add_argument("--out", required=True)
    s.add_argument("--limit", type=int, default=6)
    s.add_argument("--per-sheet", type=int, default=11)
    f = sub.add_parser("fetch")
    f.add_argument("--picks", required=True)
    f.add_argument("--candidates", required=True)
    f.add_argument("--raw", required=True, help="folder for originals + manifest.json (git-ignored)")
    b = sub.add_parser("build")
    b.add_argument("--raw", required=True)
    b.add_argument("--out", required=True)
    b.add_argument("--credits", required=True)
    b.add_argument("--keep-background", help="file with image names (slug-n) to keep as photographed")
    b.add_argument("--model", default="isnet-general-use", help="rembg model")
    b.add_argument("--no-cutout", action="store_true", help="skip background removal")
    args = ap.parse_args()
    return {"search": cmd_search, "fetch": cmd_fetch, "build": cmd_build}[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
