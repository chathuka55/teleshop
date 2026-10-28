# Seed, index and migration scripts (created in Phase 1)

| File              | Command                                                           | Notes                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrate.ts`      | `pnpm db:migrate` / `pnpm db:migrate --down 0003`                 | Runs `src/db/migrations/*.ts` in order, records them in `_migrations`                                                                                   |
| `indexes.ts`      | `pnpm db:indexes`                                                 | `Model.syncIndexes()` for every model                                                                                                                   |
| `seed.ts`         | `pnpm db:seed`                                                    | Sample data; refuses to run when `NODE_ENV=production`                                                                                                  |
| `set-password.ts` | `pnpm db:set-password <email>` / `pnpm db:set-password --sellers` | New random password (shown once), clears the lockout, signs out old sessions. For the seeded `@teleshop.local` logins, which can't receive reset emails |
