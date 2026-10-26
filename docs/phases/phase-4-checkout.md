# Phase 4 — Cart & checkout

**Goal:** a cart and COD checkout that can never oversell or accept a tampered price.

## placeOrder algorithm
1. Validate input (address id or new address, delivery method, `idempotencyKey` uuid).
2. If an order with this key exists for the user → return it (idempotent).
3. Load cart lines; load variants by SKU; drop inactive; compute line totals from DB prices.
4. Group by seller → packages; delivery fee per package from `settings`.
5. `withTransaction`: for each line `inventory.updateOne({ sku, available: { $gte: qty } }, { $inc: { reserved: qty, available: -qty } })` → if `modifiedCount === 0` throw `OUT_OF_STOCK`; insert order, payment, first `order_events`; clear cart.
6. After commit: revalidate tags, send emails.

## Claude Code prompt
> Read RULES.md, docs/02-architecture.md §3 and docs/08-data-model.md §3.4. Implement P4-T04 with integration tests: happy path, out of stock, idempotent replay, and two concurrent buyers for the last unit. Plan first.
