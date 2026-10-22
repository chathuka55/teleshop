# CLAUDE.md — rules for working in the Teleshop repo

Claude Code reads this file at the start of every session. Keep it short and true.

## What this project is

Teleshop: multi-vendor tech marketplace (phones, PCs, accessories) for Sri Lanka. Next.js 15 App Router + TypeScript strict + MongoDB Atlas (Mongoose) + Auth.js v5, deployed on Vercel. Cash on Delivery only in v1. Courier tracking codes are added by admins after hand-over.

## Before you write code

1. Read the task in `docs/13-phases.md` and its phase file in `docs/phases/`.
2. Read the docs the task touches: `docs/08-data-model.md` for any DB work, `docs/10-security.md` for any auth/input/write path, `docs/05-design-system.md` for any UI.
3. Make a short plan (files to add/change, tests to add). Wait for approval if the task says "plan first".

## Commands

- `pnpm dev` · `pnpm check` (lint + typecheck + unit) · `pnpm test:int` · `pnpm test:e2e`
- `pnpm db:indexes` · `pnpm db:migrate` · `pnpm db:seed`
- Run `pnpm check` before saying a task is done.

## Architecture rules (do not break)

- **Layers:** route/page → server action or route handler → `modules/<feature>/service.ts` → `db/repositories/*` → Mongoose model. Pages never import models directly.
- Every module has: `schema.ts` (Zod), `access.ts` (who may do what), `service.ts` (business rules), `actions.ts` (Server Actions), `types.ts`.
- **Validate all input with Zod** at the action/handler boundary. Parse, never trust.
- **Authorise in the service** with `requireRole()` + ownership checks (`assertOwnsProduct`, `assertOwnsOrderItem`).
- **Money is integer cents (LKR)**. Never use floats for money. Format only in the UI (`formatLKR`).
- **Prices, totals and stock are computed on the server.** Ignore any price sent by the client.
- Checkout, stock changes and order status changes run in a **MongoDB transaction** (`withTransaction`).
- Use **Server Components by default**; add `"use client"` only for interactive leaves.
- Never return Mongoose documents to the client. Map to plain DTOs (`toProductDTO`).
- `sanitizeFilter` is on: wrap every query operator WE write with the trusted helpers in `src/db/operators.ts` (`$in`, `$gt`, `$ne`…) — plain `{ $in }` and even `.where().in()` are neutralised.
- Dev without Atlas: `pnpm db:memory` (local replica set), then run with `MONGODB_URI=mongodb://127.0.0.1:27027/teleshop?replicaSet=rs0`.

## Security rules

- No secrets in code or logs. Read config only from `src/config/env.ts`.
- Use `sanitizeFilter` / strict schemas; never build queries from raw user objects.
- Passwords: Argon2id via `src/lib/auth/password.ts`. Tokens stored hashed.
- New route under `/admin` or `/seller` must be covered by `middleware.ts` guards and a service-level role check.
- Sensitive actions call `audit.log(...)`.
- Uploads: check MIME by content, size limit, re-encode images.

## Data rules

- Any schema change updates `docs/08-data-model.md` in the same commit (collection catalogue + migration log). `tests/unit/data-model-doc.test.ts` fails otherwise.
- Index changes go in the model file and run with `pnpm db:indexes`.
- Data changes go in `src/db/migrations/NNNN-description.ts`.

## UI rules

- Follow the Midnight Tech dark tokens in `src/styles/tokens.css` (primary #1D4ED8, accent #F59E0B, bg #0A0D14). No violet, cyan or pink.
- Glassmorphism only for: navbar, hero cards, modals/sheets, bottom bars.
- React Bits / ThreeUI components are wrapped in `src/components/ui/*` — import the wrapper, not the library, so they can be swapped.
- 3D lives only in `src/components/three/*` and is loaded with `next/dynamic({ ssr: false })`. GLBs use meshopt, never Draco (CSP).
- Images/files: Upstash Blob (ADR-005), never Vercel Blob.
- Brand assets: `public/images/brand/` (`teleshop-mark.png` transparent mark, `teleshop-logo-full*.png`); favicon is `src/app/icon.png`.

## Style

- TypeScript strict, no `any`. Named exports. Files `kebab-case.ts`, components `PascalCase.tsx`.
- Small functions, early returns, explicit return types on services.
- Tests next to the feature: `tests/unit/<module>/*.test.ts`.

## Commit format

`type(scope): summary [P<phase>-T<task>]` — e.g. `feat(orders): add tracking code to shipment [P5-T03]`.
