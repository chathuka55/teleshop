# Product images — fetch and optimise scripts

**DOC-07** · Scripts: `scripts/python/`

## 1. Rules first (legal + ethical)
- Only fetch images you are **allowed to use**: images provided by the seller, brand press/media kits that permit retail use, or your own photos.
- **Never** scrape images from other shops or marketplaces. Respect each site's **robots.txt** and terms of service.
- The script only downloads from domains you list in `ALLOWED_DOMAINS`, obeys robots.txt, waits between requests and identifies itself with a clear User-Agent.
- Keep a record: the output `manifest.csv` stores source URL, licence note and date for every image.

## 2. Workflow
1. Fill `scripts/python/input/products.csv` with: `sku, product_name, image_url, licence_note`.
2. Set allowed domains in `scripts/python/config.py`.
3. Run:

```bash
cd scripts/python
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python fetch_product_images.py --input input/products.csv --out output/raw
python optimize_images.py --src output/raw --out output/web
```

4. Upload `output/web/*.webp` through the admin product form (or `pnpm images:upload`, task P6-T05), which stores them in Upstash Blob (bucket `teleshop-images`).

## 3. What the optimiser does
- Converts to **WebP** (quality 82), sizes 1200 px and 600 px wide, keeps aspect ratio.
- Strips EXIF/GPS metadata.
- Names files `<sku>-<n>-<width>.webp`.

## 4. In the app
- Uploads go through an Upstash Blob upload handler (bytes go browser → storage, the server authorises); the server checks MIME type by file content, max 5 MB, max 8 images per product, and re-encodes with sharp.
- Display with `next/image` (`sizes` set, `priority` only for the first product image above the fold).
