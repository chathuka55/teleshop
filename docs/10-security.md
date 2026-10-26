# Security

**DOC-10** · Based on OWASP Top 10 (2021) and OWASP ASVS level 2. Every PR that touches auth, input, uploads or writes is checked against §3.

## 1. Threats and controls

| Risk | Controls |
| --- | --- |
| Broken access control | Middleware route guards (`/account`, `/seller`, `/admin`) **and** service-level `requireRole()` + ownership checks. Tests for "seller A cannot edit seller B's product". |
| Weak authentication | Argon2id (`memoryCost 19456, timeCost 2`), min 10-char passwords + breached-password check (k-anonymity HIBP API), lockout after 5 failures, admin TOTP 2FA, email verification before checkout. |
| Session theft | Auth.js JWT in `__Secure-` httpOnly, Secure, SameSite=Lax cookie; 7-day max age; `tokenVersion` in JWT to revoke all sessions on password change/suspend. |
| Injection (NoSQL) | Zod on every input; `mongoose.set('sanitizeFilter', true)`; `strict: 'throw'`; never pass raw `req.body` into a query; no `$where`/`mapReduce`. |
| XSS | React escaping; product descriptions sanitised with an allow-list (`sanitize-html`); strict **CSP with nonces** set in middleware; no `dangerouslySetInnerHTML` except sanitised descriptions. |
| CSRF | Server Actions check Origin automatically; REST mutations check `Origin`/`Sec-Fetch-Site`; SameSite cookies. |
| Price / stock tampering | Server recalculates every price and total; stock reserved with conditional `$inc` in a transaction; idempotency key on orders. |
| Fake COD orders | Verified email + phone, max 3 open COD orders per new account, cancellation history flags. |
| File upload abuse | Signed Blob uploads, allow-list MIME (jpeg/png/webp), magic-byte check, ≤ 5 MB, re-encode with sharp (strips EXIF), random file names. |
| Secrets exposure | Env validated with Zod; only `NEXT_PUBLIC_*` reach the browser; secrets in Vercel env (Production/Preview separated); GitHub secret scanning + push protection on. |
| Vulnerable dependencies | Dependabot weekly, `pnpm audit --prod` in CI, lockfile committed, pin versions. |
| Logging & monitoring | `audit_logs` for sensitive actions; Sentry for errors (PII scrubbed); alert on > 20 failed logins/min. |
| Abuse / DoS | Upstash rate limits per IP + per user (see doc 09), Vercel Firewall / attack challenge mode for bursts. |

## 2. Security headers (set in `middleware.ts` / `next.config.ts`)

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://b65e2efccddc.blob.upstash.io https://tile.openstreetmap.org;
  connect-src 'self' blob: https://*.upstash.io; worker-src 'self' blob:; font-src 'self'; frame-ancestors 'none'; base-uri 'self';
  form-action 'self'; object-src 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
```
The shop-page map loads OpenStreetMap tiles as plain images (`img-src` only — no script, no iframe); credit "© OpenStreetMap contributors" is shown and a hosted tile provider replaces it before traffic grows. Three.js needs `blob:` in `img-src`/`worker-src`/`connect-src` for embedded GLB textures, and `'wasm-unsafe-eval'` for the meshopt decoder (WebAssembly only — JS `eval` stays blocked). Every HTML page renders per request so it gets a nonce: do not prerender pages (`generateStaticParams`) while the nonce CSP is on. Source: `src/lib/security/headers.ts` (unit tested).

## 3. PR security checklist
- [ ] All new inputs have a Zod schema; no raw objects reach Mongoose.
- [ ] Service checks role **and** ownership; a test proves another user is refused.
- [ ] No price/total/stock value is taken from the client.
- [ ] No secret, token, password or full address is logged or returned in a DTO.
- [ ] Sensitive action writes to `audit_logs`.
- [ ] New page under `/admin` or `/seller` is guarded in middleware.
- [ ] Uploads use the shared `upload.ts` checks.
- [ ] Rate limit added for public or expensive endpoints.

## 4. MongoDB Atlas hardening
- Separate projects (or clusters) for **staging** and **production**.
- Database users per purpose (`teleshop_app`, `teleshop_migrator`, `teleshop_readonly`), long random passwords, rotated every 90 days.
- Network access: Vercel uses dynamic IPs — use the **Vercel ↔ Atlas integration** or allow `0.0.0.0/0` *only* with strong credentials + TLS; move to **Private Endpoint / Vercel Secure Compute** when on paid plans.
- Enable continuous cloud backup (M10+) and test a restore every quarter.
- Turn on Atlas alerts: connections, CPU, slow queries, failed auth.
