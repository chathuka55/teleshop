# Teleshop

Teleshop is a multi-vendor e-commerce marketplace for **mobile phone shops, computer shops and other tech shops in Sri Lanka**. Customers compare products from verified sellers, order with **Cash on Delivery (COD)** and follow every package with a **courier tracking code**. Sellers manage products, stock and orders. Admins verify sellers, add tracking codes and run the platform.

|                |                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Repository** | https://github.com/chathuka55/teleshop                                                                                                |
| **Stack**      | Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · MongoDB Atlas + Mongoose · Auth.js v5 · React Three Fiber (3D hero) |
| **Hosting**    | Vercel (app) · MongoDB Atlas (database) · Upstash Blob (product images, [ADR-005](docs/adr/ADR-005-upstash-blob.md))                  |
| **Design**     | Figma file _Teleshop E-Commerce Website_ — dark **Midnight Tech** theme, glassmorphism navbar and hero                                |
| **Status**     | Phases 0 + 1 done · Phase 3 storefront live on MongoDB · Phase 2 (auth) next                                                          |

---

## Contents

1. [Quick start](#1-quick-start)
2. [How the project is organised](#2-how-the-project-is-organised)
3. [Documentation map](#3-documentation-map)
4. [Development phases](#4-development-phases)
5. [Working with Claude Code](#5-working-with-claude-code)
6. [Scripts](#6-scripts)
7. [Environment variables](#7-environment-variables)
8. [Deployment](#8-deployment)
9. [Security at a glance](#9-security-at-a-glance)
10. [Contributing](#10-contributing)

---

## 1. Quick start

**You need:** Node.js 20 LTS or newer, pnpm 11 (pinned in `packageManager`), Git, a free MongoDB Atlas cluster (or Docker for a local MongoDB), and Python 3.11+ only if you use the image scripts.

```bash
git clone https://github.com/chathuka55/teleshop.git
cd teleshop
pnpm install
cp .env.example .env.local        # then fill in the values (see section 7)
pnpm db:indexes                   # creates MongoDB indexes
pnpm db:seed                      # sample categories, brands, sellers, products
pnpm dev                          # http://localhost:3000
```

**No Atlas or Docker?** `pnpm db:memory` starts a local MongoDB replica set (data in `.mongo-dev/`). In a second terminal:

```bash
export MONGODB_URI="mongodb://127.0.0.1:27027/teleshop?replicaSet=rs0"   # PowerShell: $env:MONGODB_URI="…"
pnpm db:seed && pnpm dev --port 3100
```

Demo order for `/track`: `TS-2026-000123` + `077 123 4567`.

No Atlas yet? Start a local replica set (transactions need one):

```bash
docker run -d --name teleshop-mongo -p 27017:27017 mongo:7 --replSet rs0
docker exec teleshop-mongo mongosh --eval "rs.initiate()"
# MONGODB_URI=mongodb://localhost:27017/teleshop?replicaSet=rs0
```

Seed accounts (development only):

| Role     | Email                     | Password                  |
| -------- | ------------------------- | ------------------------- |
| Admin    | `admin@teleshop.local`    | printed by `pnpm db:seed` |
| Seller   | `seller@teleshop.local`   | printed by `pnpm db:seed` |
| Customer | `customer@teleshop.local` | printed by `pnpm db:seed` |

## 2. How the project is organised

```text
teleshop/
├── CLAUDE.md                 # rules Claude Code follows in this repo
├── docs/                     # all project documentation (start at docs/00-index.md)
├── public/
│   ├── models/               # compressed .glb files for the 3D hero (phone, pc, headset)
│   └── images/placeholders/  # poster images shown while 3D loads
├── scripts/
│   ├── python/               # product image fetch + optimise scripts
│   └── seed/                 # database seed and index scripts
├── src/
│   ├── app/                  # Next.js routes: (store), (auth), account, seller, admin, api/v1
│   ├── components/           # shared UI: ui, layout, product, three, forms
│   ├── modules/<feature>/    # business logic per feature (schema, service, actions, access)
│   ├── db/                   # Mongoose connection, models, repositories, migrations
│   ├── lib/                  # auth, security, validation, cache, utils
│   ├── config/               # env validation, site config
│   ├── hooks/ · types/ · styles/
│   └── middleware.ts         # security headers, rate limit, route guards
└── tests/                    # unit, integration, e2e
```

Full explanation: [docs/04-project-structure.md](docs/04-project-structure.md).

## 3. Documentation map

| Doc                                                        | What it covers                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| [00 Index](docs/00-index.md)                               | Where to start, reading order                                 |
| [01 Project overview](docs/01-project-overview.md)         | Goals, roles, scope, version 1.0 features                     |
| [02 Architecture](docs/02-architecture.md)                 | System layers, request flow, key decisions                    |
| [03 Tech stack](docs/03-tech-stack.md)                     | Every library and why it was chosen                           |
| [04 Project structure](docs/04-project-structure.md)       | Folder-by-folder guide and naming rules                       |
| [05 Design system](docs/05-design-system.md)               | Midnight Tech tokens, glass rules, React Bits / ThreeUI usage |
| [06 3D hero](docs/06-3d-hero.md)                           | GLB slider (phone, PC, headset) for desktop and phone         |
| [07 Product images](docs/07-product-images.md)             | Python image fetch + optimise scripts, legal rules            |
| [08 Data model](docs/08-data-model.md)                     | MongoDB collections, indexes, validation, migrations          |
| [09 API](docs/09-api.md)                                   | Server Actions and `/api/v1` endpoints                        |
| [10 Security](docs/10-security.md)                         | Threat model, controls, checklists                            |
| [11 Testing](docs/11-testing.md)                           | Test pyramid, tools, coverage targets                         |
| [12 Deployment](docs/12-deployment.md)                     | MongoDB Atlas + Vercel step by step, rollback runbook         |
| [13 Phases](docs/13-phases.md)                             | Phase plan with every task and its acceptance check           |
| [14 Claude Code workflow](docs/14-claude-code-workflow.md) | How to build each task with Claude Code                       |
| [ADRs](docs/adr/)                                          | Architecture decision records                                 |

## 4. Development phases

| Phase | Name              | Outcome                                                               |
| ----- | ----------------- | --------------------------------------------------------------------- |
| **0** | Foundation        | Repo, tooling, env validation, CI, security headers, design tokens    |
| **1** | Data layer        | Mongoose models, indexes, repositories, seed data, data-model tests   |
| **2** | Auth & accounts   | Register, sign in, roles, sessions, password reset, admin 2FA         |
| **3** | Storefront        | Home with 3D hero, shop listing, filters, product page, search        |
| **4** | Cart & checkout   | Cart, wishlist, addresses, COD checkout with stock reservation        |
| **5** | Orders & tracking | My Orders, order detail, courier tracking code + courier link         |
| **6** | Seller portal     | Seller onboarding, products, stock, fulfilment (IMEI, ready to ship)  |
| **7** | Admin console     | Dashboard, orders, tracking codes, catalogue, sellers, reviews, audit |
| **8** | Hardening         | Security review, performance, accessibility, E2E suite                |
| **9** | Launch            | Production Atlas + Vercel, domain, monitoring, backups                |

Every task, with its acceptance check, is in [docs/13-phases.md](docs/13-phases.md). Detailed task files live in [docs/phases/](docs/phases/).

## 5. Working with Claude Code

Read [docs/14-claude-code-workflow.md](docs/14-claude-code-workflow.md). Short version:

1. Open the repo in Claude Code. It reads `CLAUDE.md` automatically.
2. Pick the next unchecked task in `docs/13-phases.md` (for example `P1-T03`).
3. Ask: _"Read docs/phases/phase-1-data-layer.md and implement P1-T03. Plan first, then code, then run tests."_
4. Review the diff, run `pnpm check`, commit with the task ID: `feat(db): add product model [P1-T03]`.
5. Tick the task and update any doc the task changed (the data model doc must match the code).

## 6. Scripts

| Command                                         | What it does                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                      | Start the dev server                                                                                  |
| `pnpm build` / `pnpm start`                     | Production build / run                                                                                |
| `pnpm lint` · `pnpm typecheck` · `pnpm format`  | ESLint · `tsc --noEmit` · Prettier                                                                    |
| `pnpm test` · `pnpm test:int` · `pnpm test:e2e` | Vitest unit · Vitest + in-memory Mongo · Playwright                                                   |
| `pnpm check`                                    | lint + typecheck + unit tests (run before every commit)                                               |
| `pnpm exec playwright install chromium`         | one-time browser download for `pnpm test:e2e` (desktop + Pixel 7, axe checks)                         |
| `pnpm db:indexes`                               | Create or sync MongoDB indexes                                                                        |
| `pnpm db:migrate`                               | Run pending data migrations (`--status`, `--down 0003`)                                               |
| `pnpm db:seed`                                  | Load sample data: 44 products, 5 sellers, dev accounts, demo order (refuses production / real orders) |
| `pnpm db:memory`                                | Local MongoDB replica set for development (no Atlas/Docker needed)                                    |
| `pnpm models:optimize`                          | Compress `.glb` files with gltf-transform (Draco/meshopt + WebP textures)                             |
| `python scripts/python/fetch_product_images.py` | Fetch product images from an allow-listed CSV (see doc 07)                                            |

## 7. Environment variables

Copy `.env.example` to `.env.local`. The app validates every variable at start-up with Zod (`src/config/env.ts`) and refuses to boot if one is missing or wrong.

| Variable                                              | Example                    | Notes                                                            |
| ----------------------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| `MONGODB_URI`                                         | `mongodb+srv://…/teleshop` | Atlas connection string, app user (readWrite on `teleshop` only) |
| `MONGODB_DB`                                          | `teleshop`                 | Database name                                                    |
| `AUTH_SECRET`                                         | 32+ random bytes           | `openssl rand -base64 32`                                        |
| `AUTH_URL`                                            | `http://localhost:3000`    | Public base URL                                                  |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`               |                            | Optional Google sign-in                                          |
| `TOTP_ENCRYPTION_KEY`                                 | 32 random bytes (base64)   | Encrypts admin 2FA secrets                                       |
| `UPSTASH_BLOB_TOKEN`                                  |                            | Upstash Blob — product images, avatars, seller documents         |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` |                            | Rate limiting in production                                      |
| `EMAIL_SERVER` / `EMAIL_FROM`                         |                            | Transactional email (SMTP)                                       |
| `NEXT_PUBLIC_SITE_URL`                                | `https://teleshop.lk`      | Used for SEO and links                                           |

Never commit `.env*` files except `.env.example`.

## 8. Deployment

Production runs on **Vercel** with **MongoDB Atlas**. The full step-by-step guide, including Atlas network access, database users, Vercel environment variables, preview deployments, backups and rollback, is in [docs/12-deployment.md](docs/12-deployment.md).

## 9. Security at a glance

- Passwords hashed with **Argon2id**; admins must use **TOTP 2FA**.
- Every input validated with **Zod**; MongoDB operator injection blocked (`sanitizeFilter`, strict schemas).
- Every write checks **role + ownership** in the service layer (a seller can only touch their own products and order items).
- Prices, totals and stock are **always calculated on the server** inside a MongoDB transaction.
- **Security headers + strict CSP**, rate limiting on auth/checkout, audit log for sensitive actions.
- Atlas: TLS only, least-privilege database users, IP access list, encrypted backups.

Details and checklists: [docs/10-security.md](docs/10-security.md).

## 10. Contributing

- Branches: `main` (production), `develop` (staging), `feat/<task-id>-short-name`.
- Commits: Conventional Commits with the task ID, for example `fix(cart): recalc totals on server [P4-T02]`.
- Every PR: `pnpm check` passes, docs updated, no secrets, screenshots for UI changes.
