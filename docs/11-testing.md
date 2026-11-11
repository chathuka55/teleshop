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
| Accessibility | E2E | axe on home, shop, product, track, sign-in, seller sign-up, checkout, order page, seller order, admin dashboard + order — zero serious/critical violations; keyboard: hero slider, phone menu (focus in, Escape, focus back) |
| Phone layout | E2E | menu drawer fills the screen (`tests/e2e/mobile.spec.ts`), loading screen gone within 4 s |
| Performance | CI | Lighthouse CI on `/` and `/p/[slug]` (mobile, median of 3): LCP < 2.5 s, CLS < 0.1, accessibility ≥ 0.9 (`lighthouserc.json`). Budgets after every build: first-load JS < 250 KB gzip per page, hero models ≤ 2.5 MB (`pnpm perf:budgets`) |

### Running the end-to-end suite

```bash
pnpm db:memory                                        # terminal 1 (or any throwaway database)
SEED_PASSWORD=<10+ chars> pnpm db:seed --force       # every account gets that password
pnpm build && pnpm start --port 3100                  # production build, like users get
E2E_PASSWORD=<same> E2E_BASE_URL=http://localhost:3100 pnpm test:e2e
```

`tests/e2e/flows.spec.ts` places one real order (customer → shop → admin with TOTP → customer sees the tracking link). On the first run after a seed it sets up the admin's two-step verification and keeps the secret in `node_modules/.cache/teleshop-e2e/` for later runs (or set `E2E_ADMIN_TOTP`). Without `E2E_PASSWORD` the flows are skipped. CI runs all of it on every pull request (`e2e` job: in-memory database, throwaway secrets).

### Performance (P8-T02)

```bash
pnpm build && pnpm perf:budgets      # JS per page + GLB sizes; exits 1 over budget
# with the production build running on :3100 (as above):
pnpm perf:lighthouse                 # reports in .lighthouseci/ (git-ignored)
```

Lighthouse uses **devtools throttling** (the network and CPU are really slowed down while the page loads), not the default simulated throttling. The simulation assumes every script requested before the LCP paint delays it — wrong for our server-rendered pages, where the hero text and the product photo paint before any JavaScript runs: it reported LCP ≈ 3.5 s for a page whose LCP was its first paint. Measured with devtools throttling: home ≈ 2.3 s, product ≈ 2.1 s.

Things these checks caught: the home page awaited its data at the top, so a full load first painted `(store)/loading.tsx` and then swapped the page in (CLS 1.0) — sections now stream in their own Suspense boundaries, the loading screen fills the viewport and `<main>` is `flow-root`; the product photo lacked `fetchpriority="high"`.

Safari applies HSTS and `upgrade-insecure-requests` even to `http://localhost`, so WebKit can't load a local production build — test iPhones against an https preview.

## 2. Coverage targets
Services and utils ≥ 85 % lines; overall ≥ 70 %. Critical paths (checkout, inventory, tracking, auth) 100 % of branches listed above.

## 3. Rules
- Tests never hit Atlas. Integration tests share one `MongoMemoryReplSet` per run (`tests/support/mongo-global-setup.ts`); each test file gets its own database via `connectTestDatabase("t_<name>")` and seeds with `seedDatabase()` from `scripts/seed/seed-db.ts`.
- Unit-test fixtures without a database: `tests/fixtures/products.ts` (built from the seed catalogue).
- Use factories in `tests/factories/*` (no shared mutable fixtures).
- A bug fix starts with a failing test that reproduces it.
