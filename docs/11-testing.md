# Testing

**DOC-11**

```text
        /  E2E (Playwright)  \        ~15 flows, run on preview deploys
       /  Integration (Vitest \       repositories + actions on in-memory Mongo replica set
      /    + mongodb-memory)   \
     /   Unit (Vitest)          \     services, schemas, utils — the bulk
```

## 1. What we test and how

| Area | Type | Examples |
| --- | --- | --- |
| Money & pricing | Unit | cents ⇄ LKR formatting, totals, delivery per seller, discounts |
| Zod schemas | Unit | phone `+947…`, tracking code patterns, address rules |
| Access rules | Unit | `canEditProduct(seller, product)`; customer cannot read another's order |
| Checkout | Integration | concurrent orders for the last unit → exactly one succeeds; idempotency key replay returns the same order |
| Inventory | Integration | `available` never negative; cancel releases `reserved` |
| Tracking | Integration | wrong pattern → `INVALID_TRACKING_CODE`; adds `order_events` + audit log |
| Auth | Integration | lockout after 5 failures; reset token single-use; TOTP required for admin |
| Data-model doc | Unit | every model file and migration appears in `docs/08-data-model.md` |
| Customer flow | E2E | browse → product → cart → checkout (COD) → My Orders → tracking link |
| Seller flow | E2E | accept → record IMEI → ready to ship |
| Admin flow | E2E | login with TOTP → add tracking code → customer sees it |
| Accessibility | E2E | axe on home, product, checkout, account — zero serious violations |
| Performance | CI | Lighthouse CI on `/` and `/p/[slug]` (mobile): LCP < 2.5 s, CLS < 0.1 |

## 2. Coverage targets
Services and utils ≥ 85 % lines; overall ≥ 70 %. Critical paths (checkout, inventory, tracking, auth) 100 % of branches listed above.

## 3. Rules
- Tests never hit Atlas. Integration tests share one `MongoMemoryReplSet` per run (`tests/support/mongo-global-setup.ts`); each test file gets its own database via `connectTestDatabase("t_<name>")` and seeds with `seedDatabase()` from `scripts/seed/seed-db.ts`.
- Unit-test fixtures without a database: `tests/fixtures/products.ts` (built from the seed catalogue).
- Use factories in `tests/factories/*` (no shared mutable fixtures).
- A bug fix starts with a failing test that reproduces it.
