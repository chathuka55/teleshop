#!/usr/bin/env python3
"""Download product images from an allow-listed CSV, politely and legally.

Usage:
    python fetch_product_images.py --input input/products.csv --out output/raw

Rules enforced:
  * only domains listed in config.ALLOWED_DOMAINS
  * robots.txt is respected for every host
  * a delay between requests to the same host
  * content type and size checks
  * a manifest.csv records source URL + licence note for every saved file
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import re

import requests

import config

_robots_cache: dict[str, RobotFileParser] = {}
_last_hit: dict[str, float] = {}
def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "item"


EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def allowed_by_robots(url: str) -> bool:
    parts = urlparse(url)
    base = f"{parts.scheme}://{parts.netloc}"
    rp = _robots_cache.get(base)
    if rp is None:
        rp = RobotFileParser()
        rp.set_url(f"{base}/robots.txt")
        try:
            rp.read()
        except Exception:  # network error: be safe and refuse
            print(f"  ! could not read robots.txt for {base}; skipping", file=sys.stderr)
            return False
        _robots_cache[base] = rp
    return rp.can_fetch(config.USER_AGENT, url)


def polite_wait(host: str) -> None:
    last = _last_hit.get(host)
    if last is not None:
        wait = config.REQUEST_DELAY_SECONDS - (time.monotonic() - last)
        if wait > 0:
            time.sleep(wait)
    _last_hit[host] = time.monotonic()


def fetch(url: str) -> tuple[bytes, str] | None:
    host = urlparse(url).hostname or ""
    if urlparse(url).scheme != "https":
        print(f"  ! not https, skipped: {url}", file=sys.stderr)
        return None
    if host not in config.ALLOWED_DOMAINS:
        print(f"  ! domain not allow-listed, skipped: {host}", file=sys.stderr)
        return None
    if not allowed_by_robots(url):
        print(f"  ! blocked by robots.txt, skipped: {url}", file=sys.stderr)
        return None
    polite_wait(host)
    with requests.get(url, headers={"User-Agent": config.USER_AGENT}, timeout=config.TIMEOUT_SECONDS, stream=True) as r:
        if r.status_code != 200:
            print(f"  ! HTTP {r.status_code}: {url}", file=sys.stderr)
            return None
        ctype = r.headers.get("Content-Type", "").split(";")[0].strip().lower()
        if ctype not in config.ALLOWED_CONTENT_TYPES:
            print(f"  ! unexpected content type {ctype!r}: {url}", file=sys.stderr)
            return None
        data = bytearray()
        for chunk in r.iter_content(64 * 1024):
            data.extend(chunk)
            if len(data) > config.MAX_BYTES:
                print(f"  ! file too large, skipped: {url}", file=sys.stderr)
                return None
        return bytes(data), ctype


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input", required=True, type=Path)
    ap.add_argument("--out", default=Path("output/raw"), type=Path)
    args = ap.parse_args()

    if not config.ALLOWED_DOMAINS:
        print("ALLOWED_DOMAINS is empty in config.py. Add the domains you have permission to use.", file=sys.stderr)
        return 2

    args.out.mkdir(parents=True, exist_ok=True)
    manifest_path = args.out / "manifest.csv"
    new_manifest = not manifest_path.exists()
    saved = 0
    with args.input.open(newline="", encoding="utf-8") as fin, manifest_path.open("a", newline="", encoding="utf-8") as fman:
        writer = csv.writer(fman)
        if new_manifest:
            writer.writerow(["file", "sku", "source_url", "licence_note", "sha256", "fetched_at"])
        counts: dict[str, int] = {}
        for row in csv.DictReader(fin):
            sku, url = row["sku"].strip(), row["image_url"].strip()
            print(f"- {sku}: {url}")
            result = fetch(url)
            if result is None:
                continue
            data, ctype = result
            counts[sku] = counts.get(sku, 0) + 1
            name = f"{slugify(sku)}-{counts[sku]}{EXT[ctype]}"
            (args.out / name).write_bytes(data)
            writer.writerow([name, sku, url, row.get("licence_note", ""), hashlib.sha256(data).hexdigest(),
                             datetime.now(timezone.utc).isoformat(timespec="seconds")])
            saved += 1
    print(f"Saved {saved} image(s) to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
