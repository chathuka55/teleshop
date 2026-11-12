# Deployment — MongoDB Atlas + Vercel

**DOC-12** · Environments: **Local** (dev) → **Preview** (every PR, staging DB) → **Production** (`main`, production DB).

## 1. MongoDB Atlas setup (do once per environment)

1. Create an Atlas account → new **Project** `teleshop-staging` (and later `teleshop-prod`).
2. **Create cluster**: staging = M0 (free) or Flex; production = **M10+** in `ap-south-1` (Mumbai) or the region closest to your Vercel functions. M10 gives continuous backups and auditing.
3. **Database Access → Add users** (password auth, generate long passwords):

| User | Built-in role | Used by |
| --- | --- | --- |
| `teleshop_app` | `readWrite@teleshop` (+ custom role without `remove` on `audit_logs`, `order_events`) | Vercel runtime |
| `teleshop_migrator` | `readWrite@teleshop`, `dbAdmin@teleshop` | GitHub Actions migrations only |
| `teleshop_readonly` | `read@teleshop` | Charts / analytics |

4. **Network Access**: either connect through the **MongoDB Atlas integration on the Vercel Marketplace**, or add `0.0.0.0/0` (Vercel IPs are dynamic) — only with the strong passwords above and TLS. On paid plans, prefer Private Endpoint / Vercel Secure Compute.
5. **Connect → Drivers** → copy the `mongodb+srv://` string → put user `teleshop_app` in it.
6. Turn on **alerts** (connections > 80 %, CPU > 75 %, replication lag, failed logins) and **backups** (production).

## 2. Vercel setup

1. Import `https://github.com/chathuka55/teleshop` in Vercel → Framework **Next.js**, package manager **pnpm**.
2. Settings → **Environment Variables** (separate values for *Preview* and *Production*):

| Variable | Preview | Production |
| --- | --- | --- |
| `MONGODB_URI` | staging cluster, `teleshop_app` | production cluster, `teleshop_app` |
| `MONGODB_DB` | `teleshop` | `teleshop` |
| `AUTH_SECRET` | random | different random |
| `AUTH_URL` | (leave empty — Vercel sets preview URL with `AUTH_TRUST_HOST=true`) | `https://teleshop.lk` |
| `TOTP_ENCRYPTION_KEY` | random | different random |
| `UPSTASH_BLOB_TOKEN` | Upstash Blob token (staging buckets) | production buckets |
| `DOCS_ENCRYPTION_KEY` | random (32 bytes, base64) | **the same key everywhere documents are read** — losing it makes stored seller documents unreadable ([ADR-006](adr/ADR-006-encrypted-seller-documents.md)) |
| `UPSTASH_REDIS_REST_URL/TOKEN` | Upstash (Marketplace) | separate DB |
| `BREVO_API_KEY` | (optional) | Brevo API key (`xkeysib-…`, brevo.com → SMTP & API → API Keys). When set, email goes through Brevo's HTTP API; otherwise `EMAIL_SERVER`. |
| `BREVO_SMTP_LOGIN` | (optional) | Only when `BREVO_API_KEY` holds a Brevo **SMTP** key (`xsmtpsib-…`): the SMTP login from Brevo → SMTP & API → SMTP (`…@smtp-brevo.com`); mail then goes through `smtp-relay.brevo.com:587`. |
| `EMAIL_SERVER`, `EMAIL_FROM` | sandbox SMTP | SMTP **URL** (`smtp://login:key@smtp-relay.brevo.com:587` — a bare key is ignored and logged as `email.not_configured`). `EMAIL_FROM` must be a sender verified in Brevo. |
| `CONTACT_INBOX` | (optional) | Real inbox for `/contact` messages (the address shown on the site is display-only). |

> **Check email + Sentry keys:** `pnpm integrations:check` sends a test email to `CONTACT_INBOX` and a Sentry test event with the keys in `.env.local`. Brevo answering `525 Unauthorized IP address` means Brevo → Security → **Authorised IPs** is blocking unknown IPs — turn that off (Vercel sends from changing IPs).
| `CRON_SECRET` | (not needed — crons run on production only) | random, 32+ chars (`openssl rand -hex 32`); Vercel sends it to `/api/cron/*`. Without it the daily auto-cancel job refuses to run. |
| `SENTRY_DSN` | (optional) same project, environment tells them apart | Sentry project DSN (Settings → Client Keys). Empty = errors only in Vercel logs. |
| `SENTRY_ENVIRONMENT` | (optional — defaults to `preview`) | (optional — defaults to `production`) |
| `NEXT_PUBLIC_SITE_URL` | preview URL | `https://teleshop.lk` |

> **Preview variables in one step:** `pnpm vercel:preview-env` (`scripts/dev/vercel-preview-env.mjs`) writes the *Preview* set from `.env.local` with its own database `teleshop_preview` and freshly generated `AUTH_SECRET` / `TOTP_ENCRYPTION_KEY`. Needs a Vercel token in `~/.vercel-token` or `VERCEL_TOKEN`. Then fill the preview database once: `MONGODB_DB=teleshop_preview pnpm db:seed` (PowerShell: `$env:MONGODB_DB='teleshop_preview'; pnpm db:seed`). Without these, every PR preview build fails with "Invalid environment variables". Vercel skips preview builds for `dependabot/*` branches (`ignoreCommand` in `vercel.json`) — CI still builds and tests those PRs.

3. **Storage**: create Upstash Blob buckets `teleshop-images` (public) and `teleshop-docs` (private) — [ADR-005](adr/ADR-005-upstash-blob.md). `.glb` files stay in `public/models` (served by Vercel's CDN with long cache headers).
4. **Domains**: add `teleshop.lk` + `www` → redirect `www` to apex. HTTPS is automatic.
5. **Security**: enable Vercel Firewall, Deployment Protection for previews (Vercel Authentication), and Bot protection on `/api/v1/track` and auth routes.
6. **Log alerts**: in Vercel → Observability (or a log drain to your log tool) alert on `"event":"auth.login_failed"` > 20 per minute and on any `"level":"error"` burst. Log lines are JSON, already scrubbed (docs/10 §1).
7. **Function region**: set to the region closest to the Atlas cluster (e.g. `bom1` Mumbai) in `vercel.json` or project settings.

## 3. CI/CD flow

```text
PR opened ─► GitHub Actions: lint · typecheck · unit · integration · build · pnpm audit
          └► Vercel Preview deploy (staging DB) ─► Playwright E2E against preview URL
merge to main ─► Actions: db:migrate + db:indexes (teleshop_migrator, prod) ─► Vercel Production deploy
```

`.github/workflows/ci.yml` holds the checks; `MIGRATOR_MONGODB_URI` is a **GitHub Actions secret**, never a Vercel variable. Add it under *Settings → Environments → production → Environment secrets*. Until it exists the `migrate` job is **skipped with a warning** (the run stays green) — apply migrations from a laptop with `pnpm db:migrate` in the meantime.

## 4. Release checklist
- [ ] All CI checks green on `main`.
- [ ] Migrations reviewed; idempotent; backup snapshot taken (production).
- [ ] Env vars present for Production (the app fails fast if one is missing).
- [ ] Smoke test after deploy: home loads with 3D hero, sign in, add to cart, place COD order (test seller), admin adds tracking code, tracking link opens.
- [ ] Error reporting works: Vercel logs show JSON lines; with `SENTRY_DSN` set, an event arrives in Sentry (e.g. from a preview with a broken env var) and its `digest` tag matches the reference on the error page.

## 5. Rollback runbook
1. **App bug:** Vercel → Deployments → previous production deploy → **Instant Rollback**.
2. **Bad migration:** run the migration's `down()` with `pnpm db:migrate --down NNNN` using the migrator user; if data was damaged, restore the Atlas snapshot to a **new** cluster, verify, then switch `MONGODB_URI`.
3. **Leaked secret:** rotate it (Atlas user password / `AUTH_SECRET` / Blob token), redeploy, bump `tokenVersion` for all users if `AUTH_SECRET` leaked.
4. Write a short post-incident note in `docs/incidents/YYYY-MM-DD.md`.
