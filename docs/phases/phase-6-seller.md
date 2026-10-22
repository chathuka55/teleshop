# Phase 6 — Seller portal

**Goal:** verified shops can manage products, stock and fulfil orders (Figma S1–S4).

## Notes
- All seller queries are scoped by `session.sellerId` inside the repository call.
- IMEI: 15 digits + Luhn check; serial: 6–30 alphanumerics. Required for `category.requiresSerial = true` before "Ready to ship".
- New products or price change > 20 % → `pending_review` (admin approves).

## Claude Code prompt
> Implement P6-T04 (fulfilment). Include access tests proving seller A cannot change seller B's package. Plan first.
