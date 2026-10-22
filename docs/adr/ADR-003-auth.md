# ADR-003: Auth.js v5 with JWT sessions, Argon2id and admin TOTP

**Status:** Accepted · **Date:** 2026-10

## Decision
- **Auth.js v5** with Credentials (email + password) and Google providers.
- **JWT session strategy** (works in middleware at the edge) carrying `role`, `sellerId`, `tokenVersion`, `twoFactorVerified`.
- Passwords hashed with **Argon2id** (`@node-rs/argon2`).
- **TOTP 2FA** (otplib) mandatory for admins; secrets encrypted with AES-256-GCM (`TOTP_ENCRYPTION_KEY`).
- Revocation: bump `users.tokenVersion`; session callback compares it (cached briefly).

## Consequences
- Easier: standard flows, edge-compatible guards, Google sign-in.
- Harder: JWTs cannot be killed instantly — mitigated by short re-check interval and `tokenVersion`.
