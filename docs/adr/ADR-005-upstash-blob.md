# ADR-005: Upstash Blob for file storage (replaces Vercel Blob)

**Status:** Accepted · **Date:** 2026-10-22 · **Deciders:** Chathuka Jayasekara

## Context
We need storage for product images, profile photos and seller verification documents. ADR-002 assumed Vercel Blob. Two things changed: the project must stay on free tiers during development, and Vercel's free Hobby plan is for personal, non-commercial use. Upstash Redis is already in use for rate limiting.

## Decision
Use **Upstash Blob** (S3-compatible object storage, Cloudflare CDN) with two buckets:

| Bucket | Access | Holds |
| --- | --- | --- |
| `teleshop-images` | public | product images, profile photos, shop logos |
| `teleshop-docs` | private (signed, time-limited URLs) | seller business-registration documents |

Config: `UPSTASH_BLOB_TOKEN` (required in production by `src/config/env.ts`). SDK `@upstash/blob` is installed when uploads are built (P2-T06 / P6-T01). Uploads still follow doc 10: server-side upload handler checks role, type by magic bytes, ≤ 5 MB, ≤ 8 images per product, and re-encodes with sharp.

## Options considered
| | Upstash Blob | Vercel Blob | Cloudflare R2 | Cloudinary |
| --- | --- | --- | --- | --- |
| Free tier | 1 GB, 10 GB egress, 10k/2k ops | same | 10 GB, free egress | 25 credits |
| Card needed for free tier | No | No | Reported yes | No |
| Over the limit (no card) | Paused until month resets; never charged | Paused 30 days | — | Suspended / upsell |
| Private files | Yes (signed URLs) | — | Yes | Yes |
| Commercial use on free tier | Yes | No (Hobby) | Yes | Yes |
| Vendors to manage | 1 (already have Redis) | +1 | +1 | +1 |

## Consequences
- Easier: one vendor for Redis + files; private bucket for KYC documents; S3 API means we can move to R2/S3 later without rewriting storage code.
- Harder: `@upstash/blob` is a young SDK (0.0.x in Oct 2026). If its API churns, use the S3-compatible API via the AWS SDK instead — keep all storage calls behind `src/lib/storage/*`.
- To do with the first upload: add the bucket's public CDN host to `img-src` (CSP, `src/lib/security/headers.ts`) and `images.remotePatterns` (`next.config.ts`).
- Revisit: Cloudflare R2 if image egress grows (free egress).
