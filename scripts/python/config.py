"""Settings for the product image scripts. Edit ALLOWED_DOMAINS before running."""

# Only download from domains you have permission to use (seller sites, brand media kits, your own CDN).
ALLOWED_DOMAINS: set[str] = {
    # "media.example-brand.com",
    # "seller-uploads.example.com",
}

USER_AGENT = "TeleshopImageFetcher/1.0 (+https://teleshop.lk/contact)"
REQUEST_DELAY_SECONDS = 2.0       # polite delay between requests to the same host
TIMEOUT_SECONDS = 20
MAX_BYTES = 10 * 1024 * 1024      # refuse files larger than 10 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

WEB_WIDTHS = (1200, 600)          # output sizes for the website
WEBP_QUALITY = 82
