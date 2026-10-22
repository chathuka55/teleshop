# Phase 5 — Orders & tracking

**Goal:** customers always know where each package is, and can open the courier site with one tap.

## Notes
- Timeline = `order_events` for the package, mapped to friendly labels (Figma 13, M5).
- Tracking URL: `courier.trackingUrlTemplate.replace('{code}', encodeURIComponent(code))`; open with `rel="noopener noreferrer" target="_blank"`.
- Guest `/track`: requires order number **and** the phone on the order; responds the same way for "not found" and "wrong phone" (no enumeration).

## Claude Code prompt
> Implement P5-T02 and P5-T03. Reuse the TrackingCodeBox component on desktop and mobile. Add tests for the URL builder and the /track rate limit. Plan first.
