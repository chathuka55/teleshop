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

## 3. Demo photos from Wikimedia Commons
Until sellers upload their own photos, seeded products use freely licensed photos from Wikimedia Commons (`scripts/python/fetch_commons_images.py`). Each photo shows the product or the closest model on Commons.

- **Several photos per product** (up to 4; main photo first). Files: `public/images/products/<slug>-<n>.webp`.
- **Backgrounds removed** with [rembg](https://github.com/danielgatis/rembg) (`isnet-general-use` model, runs locally) and trimmed to the object, so products sit on the dark tiles. Photos where the cut-out looks wrong are listed in `input/keep-background.txt` and keep their background.
- Licences: only CC0, public domain, CC BY and CC BY-SA. Author, licence **and what we changed** (e.g. "background removed, cropped, resized, WebP") for every photo are in `src/config/product-image-credits.ts` (generated) and shown on **`/credits`** (linked in the footer) — CC BY/BY-SA require this. The cut-outs stay under the original photo's licence.
- Only the Wikimedia API and its own CDNs are contacted, one request at a time, with a contact User-Agent.
- A person picks every image: `search` writes candidates + contact sheets; you list the chosen numbers per product in `input/commons-picks.csv` (`slug,choices`, e.g. `4 3 5`; `0` = keep the drawn illustration).
- Migration `0004-demo-product-images` attaches them (via `src/config/product-images.ts`) to products that have no images — seller uploads are never replaced; `pnpm db:seed` includes them.

```bash
cd scripts/python
pip install -r requirements.txt "rembg[cpu]"
python fetch_commons_images.py search --queries input/commons-queries.csv --out output/commons
# look at output/commons/sheet-*.jpg, fill input/commons-picks.csv
PYTHONIOENCODING=utf-8 python fetch_commons_images.py fetch --picks input/commons-picks.csv   --candidates output/commons/candidates.json --raw output/commons/raw
PYTHONIOENCODING=utf-8 python fetch_commons_images.py build --raw output/commons/raw   --out ../../public/images/products --credits ../../src/config/product-image-credits.ts   --keep-background input/keep-background.txt
```

### Shop photos
Demo shops use the same script with `input/seller-queries.csv` / `input/seller-picks.csv`, built without background removal into `public/images/sellers/` (`--no-cutout --max 1600 --public-prefix /images/sellers --export-name sellerPhotoCredits --type-name SellerPhotoCredit`). Photos with identifiable people or a famous brand's storefront are skipped — a fictional shop must not look like a real person's or brand's. On Git Bash prefix the command with `MSYS_NO_PATHCONV=1` (it rewrites `/images/...` arguments into Windows paths; the script now refuses such a prefix). Real sellers upload their own photos in the seller portal (Phase 6).

### On the product page
- The gallery shows every photo with thumbnails. **Zoom:** with a mouse the photo magnifies 2.2× under the cursor while hovering; on touch screens a tap zooms in at that spot and a second tap zooms out (`src/components/product/ProductGallery.tsx`).

## 4. What the optimiser does
- Converts to **WebP** (quality 82), sizes 1200 px and 600 px wide, keeps aspect ratio.
- Strips EXIF/GPS metadata.
- Names files `<sku>-<n>-<width>.webp`.

## 5. In the app
- Uploads go through an Upstash Blob upload handler (bytes go browser → storage, the server authorises); the server checks MIME type by file content, max 5 MB, max 8 images per product, and re-encodes with sharp.
- Display with `next/image` (`sizes` set, `priority` only for the first product image above the fold).
