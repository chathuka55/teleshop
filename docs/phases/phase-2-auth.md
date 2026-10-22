# Phase 2 — Auth & accounts

**Goal:** secure sign-up/sign-in for customers and sellers, Google sign-in, password reset, admin 2FA, guarded routes.

## Key rules
- Argon2id via `@node-rs/argon2`; constant-time compare; generic error "Email or password is incorrect".
- JWT callback adds `role`, `sellerId`, `tokenVersion`; session callback re-checks `tokenVersion` every 5 min (cached) to support revocation.
- Admin sessions require `twoFactorVerified: true` in the token; middleware redirects `/admin/*` to `/admin/login` otherwise.
- Email verification required before checkout (not before browsing).

## Claude Code prompt
> Read CLAUDE.md, docs/10-security.md and docs/08-data-model.md §3.2. Implement P2-T01 and P2-T04 with unit tests for guards (customer cannot reach /seller, seller cannot reach /admin). Plan first.
