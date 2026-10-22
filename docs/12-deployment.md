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
| `UPSTASH_REDIS_REST_URL/TOKEN` | Upstash (Marketplace) | separate DB |
| `EMAIL_SERVER`, `EMAIL_FROM` | sandbox SMTP | real SMTP |
| `NEXT_PUBLIC_SITE_URL` | preview URL | `https://teleshop.lk` |

3. **Storage**: create Upstash Blob buckets `teleshop-images` (public) and `teleshop-docs` (private) — [ADR-005](adr/ADR-005-upstash-blob.md). `.glb` files stay in `public/models` (served by Vercel's CDN with long cache headers).
4. **Domains**: add `teleshop.lk` + `www` → redirect `www` to apex. HTTPS is automatic.
5. **Security**: enable Vercel Firewall, Deployment Protection for previews (Vercel Authentication), and Bot protection on `/api/v1/track` and auth routes.
6. **Function region**: set to the region closest to the Atlas cluster (e.g. `bom1` Mumbai) in `vercel.json` or project settings.

## 3. CI/CD flow

```text
PR opened ─► GitHub Actions: lint · typecheck · unit · integration · build · pnpm audit
          └► Vercel Preview deploy (staging DB) ─► Playwright E2E against preview URL
merge to main ─► Actions: db:migrate + db:indexes (teleshop_migrator, prod) ─► Vercel Production deploy
```

`.github/workflows/ci.yml` holds the checks; `MIGRATOR_MONGODB_URI` is a **GitHub Actions secret**, never a Vercel variable.

## 4. Release checklist
- [ ] All CI checks green on `main`.
- [ ] Migrations reviewed; idempotent; backup snapshot taken (production).
- [ ] Env vars present for Production (the app fails fast if one is missing).
- [ ] Smoke test after deploy: home loads with 3D hero, sign in, add to cart, place COD order (test seller), admin adds tracking code, tracking link opens.

## 5. Rollback runbook
1. **App bug:** Vercel → Deployments → previous production deploy → **Instant Rollback**.
2. **Bad migration:** run the migration's `down()` with `pnpm db:migrate --down NNNN` using the migrator user; if data was damaged, restore the Atlas snapshot to a **new** cluster, verify, then switch `MONGODB_URI`.
3. **Leaked secret:** rotate it (Atlas user password / `AUTH_SECRET` / Blob token), redeploy, bump `tokenVersion` for all users if `AUTH_SECRET` leaked.
4. Write a short post-incident note in `docs/incidents/YYYY-MM-DD.md`.
