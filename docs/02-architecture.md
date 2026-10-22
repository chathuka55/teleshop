# Architecture

**DOC-02** · Status: Draft v1.0 · Related ADRs: [001](adr/ADR-001-mongodb-atlas.md), [002](adr/ADR-002-nextjs-vercel.md), [003](adr/ADR-003-auth.md), [004](adr/ADR-004-3d-hero.md)

## 1. Context and goals
- One Next.js app serves the storefront, seller portal and admin console (simple deploy on Vercel).
- **Lightweight:** Server Components by default, small client bundles, 3D loaded only where needed.
- **Secure by default:** every request validated, every write authorised, money and stock computed on the server.
- **Correct money and stock:** transactions for checkout and stock changes; idempotent order placement.

## 2. High-level design

```text
 Browser (desktop / tablet / phone)
        │  HTTPS
        ▼
 ┌──────────────────────── Vercel ─────────────────────────┐
 │ middleware.ts  → security headers, CSP nonce,            │
 │                  rate limit, auth + role route guards    │
 │                                                          │
 │ app/ (RSC pages)          app/api/v1 (route handlers)    │
 │      │  Server Actions          │                        │
 │      └──────────┬───────────────┘                        │
 │                 ▼                                        │
 │ modules/<feature>/service.ts   (business rules, access)  │
 │                 ▼                                        │
 │ db/repositories/*  → Mongoose models                     │
 └─────────┬──────────────────────┬────────────────┬────────┘
           ▼                      ▼                ▼
   MongoDB Atlas (replica   Upstash Blob      Upstash Redis
   set, TLS, backups)       (images)          (rate limit)
```

## 3. Request flow — placing an order

1. `POST` Server Action `placeOrder(formData)`.
2. Zod validates address, delivery method, idempotency key.
3. `requireUser('customer')`; rate limit `checkout:<userId>` (5/min).
4. `orders.service.placeOrder()` loads the cart from MongoDB, **re-prices every line from the products collection**, computes delivery per seller.
5. `withTransaction`: for each variant, conditional update `inventory.updateOne({ sku, available: { $gte: qty } }, { $inc: { reserved: qty } })`; abort if any fails.
6. Insert order (packages split by seller), payment (`pending`, `cod`), status history; clear cart; commit.
7. `revalidateTag('stock:<sku>')`, email the customer and sellers, return order number.

## 4. Layers and their jobs

| Layer | Folder | Job | Must not |
| --- | --- | --- | --- |
| Route / page | `src/app` | Render, read search params, call services | Import Mongoose models |
| Action / handler | `modules/*/actions.ts`, `app/api/v1` | Parse input (Zod), call one service | Contain business rules |
| Service | `modules/*/service.ts` | Rules, access checks, transactions, audit | Read `process.env` directly |
| Repository | `src/db/repositories` | Queries, projections, DTO mapping | Know about HTTP or sessions |
| Model | `src/db/models` | Schema, validation, indexes | Contain business logic |

## 5. Key decisions (summary)

| Decision | Choice | Why |
| --- | --- | --- |
| Database | MongoDB Atlas + Mongoose | Flexible specs/variants per category, free tier, Vercel integration ([ADR-001](adr/ADR-001-mongodb-atlas.md)) |
| App framework / host | Next.js 15 App Router on Vercel | RSC, Server Actions, ISR, zero-ops deploy ([ADR-002](adr/ADR-002-nextjs-vercel.md)) |
| Auth | Auth.js v5, JWT sessions, Argon2id, TOTP for admins | Standard, secure, works on the edge ([ADR-003](adr/ADR-003-auth.md)) |
| 3D | React Three Fiber + drei, compressed GLB, lazy loaded | Best React 3D stack; small bundles ([ADR-004](adr/ADR-004-3d-hero.md)) |
| Images | Upstash Blob + `next/image` | Free tier allows commercial use, private bucket for KYC docs, S3-compatible ([ADR-005](adr/ADR-005-upstash-blob.md)) |
| Rate limit | Upstash Redis (`@upstash/ratelimit`) | Works across serverless instances |

## 6. Caching
- Product and category pages: ISR with `revalidateTag('product:<id>')`, `revalidateTag('category:<slug>')` after any change.
- Cart, account, seller and admin pages: dynamic, never cached.
- MongoDB connection cached on `globalThis` to survive hot reloads and serverless reuse.

## 7. What we will revisit as we grow
- Search: move from MongoDB text index to **Atlas Search** when the catalogue passes ~50k products.
- Background jobs (emails, reminders): move from inline calls to a queue (Vercel Queues / Inngest).
- Courier sync: replace manual tracking codes with courier APIs where available.
