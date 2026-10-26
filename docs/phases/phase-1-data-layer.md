# Phase 1 — Data layer

**Goal:** every collection in [doc 08](../08-data-model.md) exists as a Mongoose model with indexes, repositories, migrations and seed data.

## Steps
1. `pnpm add mongoose zod` · dev: `mongodb-memory-server vitest`.
2. `src/db/mongoose.ts`: cache `mongoose.connect()` on `globalThis`; `mongoose.set('strictQuery', true)`, `sanitizeFilter: true`; export `withTransaction(fn)` using `session.withTransaction`.
3. One model file per collection; export the model and inferred type. Use `timestamps: true`, `strict: 'throw'`, `select: false` for secrets.
4. Repositories accept owner ids for owned data (e.g. `productRepo.findForSeller(sellerId, …)`) and return DTOs.
5. Migration runner `scripts/seed/migrate.ts` storing applied migrations in a `_migrations` collection.
6. Seed realistic Sri Lankan data (LKR prices in cents, districts, couriers).
7. Doc-sync test: read `src/db/models/*.model.ts` names and `src/db/migrations/*.ts`, assert each appears in doc 08.

## Claude Code prompt
> Read RULES.md and docs/08-data-model.md fully. Implement P1-T01 (connection + withTransaction) with an integration test using MongoMemoryReplSet. Do not create models yet. Plan first.
