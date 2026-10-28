# Phase plan

**DOC-13** · Tick a task (`[x]`) in the same PR that finishes it. Each phase has a detail file in [phases/](phases/) with steps and a ready-to-use Claude Code prompt.

**Definition of done (every task):** code + tests pass `pnpm check` · docs updated · no new lint/security warnings · reviewed diff · committed as `type(scope): summary [Px-Tyy]`.

---

## Phase 0 — Foundation · [details](phases/phase-0-foundation.md)
- [x] **P0-T01** Create Next.js 15 app (TS strict, App Router, `src/`, Tailwind v4, pnpm). *Check:* `pnpm dev` shows the default page.
- [x] **P0-T02** Tooling: ESLint (+ security plugin), Prettier, Husky + lint-staged, commitlint, `pnpm check` script. *Check:* bad commit message is rejected.
- [x] **P0-T03** `src/config/env.ts` with Zod; app fails to start when a variable is missing. *Check:* unit test.
- [x] **P0-T04** Security headers + CSP nonce in `middleware.ts`; `next.config.ts` hardening (`poweredByHeader: false`). *Check:* securityheaders.com grade A on preview.
- [x] **P0-T05** Design tokens (`tokens.css`, `glass.css`), fonts (Space Grotesk + Inter via `next/font`), base UI: Button, Badge, Input, GlassPanel. *Check:* `/dev/ui` preview page matches Figma.
- [ ] **P0-T06** GitHub Actions CI (lint, typecheck, unit, build, audit) + Vercel project linked with Preview deploys. *Check:* PR shows green checks + preview URL. — _CI on Node 24 (`actions/*@v5`); Vercel linked, production deploys from `main` (bom1). Preview deploys need the Preview env vars: run `pnpm vercel:preview-env` once (docs/12 §2). CI `migrate` skips with a warning until `MIGRATOR_MONGODB_URI` is set._

## Phase 1 — Data layer · [details](phases/phase-1-data-layer.md)
- [x] **P1-T01** `db/mongoose.ts`: cached connection, `sanitizeFilter`, `withTransaction()` helper. *Check:* integration test runs a transaction on `MongoMemoryReplSet`.
- [x] **P1-T02** Models: users, accounts, verification_tokens, password_resets, settings, couriers, counters, audit_logs.
- [x] **P1-T03** Models: sellers, categories, brands, products (embedded variants), inventory, reviews.
- [x] **P1-T04** Models: addresses, carts, wishlists, orders (packages/items/shipment), order_events, payments, payouts.
- [x] **P1-T05** Repositories + DTO mappers; `money.ts` helpers. *Check:* no repository returns `passwordHash`.
- [x] **P1-T06** Migration runner + `0001-init`, `0002-validators`, `0003-seed-couriers-settings`; `pnpm db:indexes`.
- [x] **P1-T07** Seed script (categories, brands, 3 sellers, 40 products, users) — refuses `NODE_ENV=production`.
- [x] **P1-T08** `tests/unit/data-model-doc.test.ts` keeps doc 08 in sync. *Check:* removing a model row from the doc fails the test.

## Phase 2 — Auth & accounts · [details](phases/phase-2-auth.md)
- [x] **P2-T01** Auth.js v5 config: Credentials (Argon2id) + Google, JWT strategy with `role`, `sellerId`, `tokenVersion`. — _Lockout after 5 failures, 5-min re-check (revocation), audit log. Google switches on when `AUTH_GOOGLE_ID/SECRET` are set._
- [x] **P2-T02** Register, sign in, sign out, email verification pages (Figma 07, 08). Rate limits. — _No account enumeration (same answer + "already registered" email), breached-password check (HIBP k-anonymity), 24 h single-use links at `/verify-email`._
- [x] **P2-T03** Forgot / reset password (hashed single-use tokens, 30 min). Lockout after 5 failures. — _`/reset-password`; a reset signs out every device (tokenVersion) and replaces older links._
- [x] **P2-T04** Route guards in middleware + `requireRole()` / ownership helpers in `lib/auth/guards.ts`. — _Rules in `lib/auth/route-access.ts`, pure checks in `lib/auth/authorize.ts` (unit tested)._
- [x] **P2-T05** Admin TOTP 2FA (enrol with QR, verify, recovery codes, encrypted secret). Admin login page (A1). — _`/admin/login`: AES-256-GCM secret, 10 single-use recovery codes (SHA-256), replay guard (time step), 5 tries/min/user; the session is upgraded only by redeeming a one-time server proof in the jwt callback (browser session updates are ignored)._
- [x] **P2-T06** Navbar Guest/Logged-in states (name + profile photo), profile page with avatar upload (Blob, sharp). — _`/account`: profile, verification banner, change password, sign out everywhere, profile photo (type checked by content, ≤ 4 MB, re-encoded to a 320 px WebP without EXIF, stored in Upstash Blob)._

## Phase 3 — Storefront · [details](phases/phase-3-storefront.md)
- [x] **P3-T01** Layout: glass Navbar, Footer, mobile bottom tab bar, menu drawer.
- [x] **P3-T02** Home page sections (hero copy, trust strip, categories, featured products, promos, brands, shops, how it works, newsletter).
- [x] **P3-T03** **3D hero slider** (phone, PC, headset GLB) per [doc 06](06-3d-hero.md). *Check:* acceptance list in doc 06. — _4 slides: iPhone 17 Pro + MacBook Pro GLBs (CC BY 4.0), procedural PC, headset._
- [x] **P3-T04** Shop listing `/shop` + `/c/[slug]`: filters from category spec template, sort, cursor pagination, URL state. — _Spec filters `?spec.<key>=a,b` (allow-listed options; matches spec prefix or variant attribute). `/deals` page added._
- [x] **P3-T05** Product page `/p/[slug]`: gallery, variant picker (price/stock per SKU), specs, seller card, reviews, related. ISR + tags. — _Up to 4 photos with hover/tap zoom. ISR deliberately not used — every page renders per request for the CSP nonce (doc 10 §2)._
- [x] **P3-T06** Search (text index), compare page (up to 4), seller shop page `/s/[shop]`. — _Shop page is an immersive profile: cover photo, glass identity card, call + directions, about/hours, photo gallery, OpenStreetMap map with pin (migration 0006 for demo shops)._
- [ ] **P3-T07** Info pages: about, contact (form + rate limit), help/FAQ, terms & privacy. SEO metadata, sitemap, robots, JSON-LD Product. — _Done except persisting newsletter sign-ups; contact form sends when `EMAIL_SERVER` is set._

## Phase 4 — Cart & checkout · [details](phases/phase-4-checkout.md)
- [x] **P4-T01** Cart service: guest cart (signed cookie), saved cart, merge on login, prices always from DB. — _Guest cart stays in the browser (SKU + qty only, no prices — a signed cookie adds nothing it needs); signed-in carts are saved in `carts`, merged with the browser cart once per page load (max qty per SKU), saved after every change. Prices always from the DB._
- [x] **P4-T02** Cart page (grouped by seller) + mini cart; wishlist. — _Cart page grouped by seller, navbar count; wishlist saved for signed-in users._
- [x] **P4-T03** Addresses CRUD (account + checkout). — _`/account/addresses` (max 10, one default) and inline at checkout; every query scoped to the owner._
- [x] **P4-T04** `placeOrder` transaction: reprice, reserve stock, split packages, payment `pending`, order number, idempotency. *Check:* race test — 2 buyers, 1 unit. — _`modules/orders/checkout.ts`; integration tests: happy path, idempotent replay (incl. 2 parallel submits), last-unit race, out-of-stock rollback, express fees, unverified email, other user's address, max 3 open COD orders._
- [x] **P4-T05** Checkout page (stepper, delivery method, COD) + confirmation page + emails. — _`/checkout` (address → standard/express → COD → server-priced summary), confirmation = `/account/orders/[no]?placed=1`, plain-text confirmation email; `/account/orders` lists orders._

## Phase 5 — Orders & tracking · [details](phases/phase-5-tracking.md)
- [x] **P5-T01** My Orders list (tabs, search) and order detail with per-package timeline from `order_events`. — _tabs All/Active/Delivered/Cancelled + search by order no. or product (`?tab=&q=`); "Package history" per package (order-wide events such as "placed" appear in every package)._
- [x] **P5-T02** Tracking box: courier name, tracking code (copy), **"Track on courier website"** link built from courier template. — _`TrackingCodeBox` on `/track` and on the order page for shipped packages._
- [x] **P5-T03** Public `/track` lookup (order no. + phone), rate limited. — _Server Action, 10/min/IP, same answer for unknown order and wrong phone; the REST `GET /api/v1/track` comes with the rest of `/api/v1`._
- [x] **P5-T04** Cancel order rules (before shipped), stock release, notifications. — _customer cancels the whole order while every package is pending → ready_to_ship; one transaction releases reserved stock, sets statuses, adds timeline events, written only if the order is unchanged; customer + shop emails. Seller/admin cancels arrive with Phases 6–7._
- [x] **P5-T05** Reviews after delivery (verified purchase), rating caches. — _from the order page per delivered item, one per item (unique index), own-shop products refused; product + shop `rating` updated as a running average in the same transaction; shown on the product page as "First L." with a verified badge. Moderation is P7._

## Phase 6 — Seller portal · [details](phases/phase-6-seller.md)
- [x] **P6-T01** Seller application (S register, document upload) → pending state. — _`/register/seller`: guests are asked to sign in / create an account first; a verified customer applies → shop `pending` (one per user, unique slug), confirmation email, status card (pending / rejected with reason → re-apply / approved → dashboard). **Document upload not built:** it needs the private `teleshop-docs` bucket from ADR-005, which isn't set up yet — documents must never go to the public image bucket._
- [x] **P6-T02** Seller dashboard (S1): KPIs, to-do list, recent orders, payout card. — _this month (Sri Lanka time): delivered sales, orders, average order, shop rating; to-do counts; ready-to-pay-out + still-to-collect card; low-stock card._
- [x] **P6-T03** Products & stock (S3): create/edit product with spec template + variants, image upload, stock steppers. — _`/seller/products` (status tabs, search), `/seller/products/new` → draft, `/seller/products/[id]` (status, photos, form): spec fields from the category template, variants with options (template select fields + colour), price in rupees → cents, “was” price, opening stock; SKUs generated or typed, unique, fixed once saved. Photos: up to 8, checked by content and re-encoded to WebP ≤ 1600 px in Upstash Blob, cover + remove. Draft → review needs a photo; published edits with a price move > 20 % go back to `pending_review`; off sale / back on sale. `/seller/inventory`: steppers + set, never below reserved. Admin approval is P7._
- [x] **P6-T04** Orders & fulfilment (S2): accept, pack, **record IMEI/serial**, mark ready to ship. — _`/seller/orders` (tabs New / To pack / Ready / Shipped / Delivered / Cancelled, search) and `/seller/orders/[no]`; accept → pack → one IMEI/serial per unit (15-digit IMEIs Luhn-checked; required for `requiresSerial` categories) → ready to ship, or cancel with a reason (stock released). Every query filtered by the shop's own id; full address + phone only after accepting; new-order email to the shop, confirmed/cancelled emails to the customer. Order items now hold `serialNumbers[]` (migration 0008). `/seller` shows the to-do counts and recent orders (rest of S1 is P6-T02)._
- [x] **P6-T05** Payouts & shop settings (S4); public shop page data. — _`/seller/payouts`: delivered COD minus the platform fee (`settings.platformFeeBp`, on item value only), paid / scheduled / ready / still to collect, payout history (payout records are created by admins — P7). `/seller/settings`: description, hours, phone, address, tags, dispatch days, bank (name, branch, last 4 only), cover photo — all shown on `/s/[shop]`._

## Phase 7 — Admin console · [details](phases/phase-7-admin.md)
- [ ] **P7-T01** Admin layout (sidebar), dashboard (A2) with "awaiting tracking code" queue.
- [ ] **P7-T02** Orders list (A3) + order detail (A4) with **Courier & Tracking panel** → `addTrackingCode`, mark COD paid.
- [ ] **P7-T03** Products moderation (A5/A6), categories + spec templates, brands (A7), inventory (A8).
- [ ] **P7-T04** Customers (A9), sellers approvals (A10), reviews moderation (A11).
- [ ] **P7-T05** Reports (A12), couriers & settings (A13), audit logs viewer (A14).
- [ ] **P7-T06** Admin mobile views (AM1–AM3).

## Phase 8 — Hardening · [details](phases/phase-8-hardening.md)
- [ ] **P8-T01** Security review against doc 10 checklist (run `/code-review` on every module).
- [ ] **P8-T02** Performance: Lighthouse CI, bundle analysis, image + GLB budgets.
- [ ] **P8-T03** Accessibility: axe on key pages, keyboard paths, focus states.
- [ ] **P8-T04** Full E2E suite (customer, seller, admin flows) on preview.
- [ ] **P8-T05** Error pages, Sentry, logging hygiene (no PII).

## Phase 9 — Launch · [details](phases/phase-9-launch.md)
- [ ] **P9-T01** Production Atlas (M10+), users, network, backups, alerts.
- [ ] **P9-T02** Vercel production env vars, domain, firewall, region.
- [ ] **P9-T03** Migration + seed of real categories/couriers; onboard first sellers.
- [ ] **P9-T04** Release checklist + rollback drill (doc 12 §4–5).
