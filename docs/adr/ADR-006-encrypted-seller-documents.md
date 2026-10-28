# ADR-006: Encrypt seller documents before storing them in the public bucket

**Status:** Accepted · **Date:** 2026-10-28 · **Deciders:** Chathuka Jayasekara

## Context
ADR-005 planned a second, **private** Upstash Blob bucket (`teleshop-docs`) for sellers' business-registration documents (KYC). On Upstash's free plan an account can have **one** bucket, and visibility (public / private) is set per bucket. Our one bucket is public: any object in it can be fetched by anyone who has its URL.

## Decision
Keep a single public bucket and make the documents useless to anyone without our key:

- The server checks the upload (PDF by its `%PDF-` header, or a JPG/PNG photo that is re-encoded with sharp, ≤ 4 MB) and **encrypts it with AES-256-GCM** using `DOCS_ENCRYPTION_KEY` (32 random bytes, base64) before `put`. A fresh 12-byte IV per file; the storage path is the associated data, so a ciphertext copied to another path fails to decrypt.
- Objects live under `kyc/<userId>-<random>.bin` as `application/octet-stream`, `Cache-Control: no-store`. Their URL is never stored or shown; MongoDB keeps `sellers.documents[]` (`kind`, `path`, `contentType`, `size`, `uploadedAt`).
- Admins download a document through `GET /admin/sellers/[id]/document` (middleware: admin + TOTP; the service checks the role again). It is decrypted in memory and sent as an attachment with `no-store`, `nosniff` and `Content-Security-Policy: sandbox`. Every view is audit-logged.
- Code: `src/lib/security/doc-crypto.ts` (pure crypto), `src/lib/storage/documents.ts` (encrypted store), `src/lib/documents/business-document.ts` (upload checks).

## Options considered
| | Encrypt into the public bucket | Second private bucket | MongoDB (binary) | Unguessable public path only |
| --- | --- | --- | --- | --- |
| Free plan | Yes | No (one bucket) | Yes | Yes |
| A leaked URL exposes the file | No (ciphertext) | No (signed URLs) | n/a | **Yes** |
| Database size | Unchanged | Unchanged | Grows with every file (512 MB free) | Unchanged |
| New secret to manage | `DOCS_ENCRYPTION_KEY` | Second token | None | None |

## Consequences
- Easier: no paid plan, no second vendor account; leaked object URLs reveal nothing.
- Harder: `DOCS_ENCRYPTION_KEY` must be identical everywhere that reads documents (local, Vercel Production) and **must not be lost** — without it the stored documents can't be read. Rotating it means re-encrypting existing files (a migration that reads with the old key and writes with the new).
- Revisit: if the account moves to a paid plan, a private bucket with signed URLs can replace this (keep the encryption as defence in depth).
