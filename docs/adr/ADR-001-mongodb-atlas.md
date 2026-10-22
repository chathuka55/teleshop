# ADR-001: MongoDB Atlas with Mongoose as the primary database

**Status:** Accepted · **Date:** 2026-10 · **Deciders:** Chathuka Jayasekara

## Context
Products differ a lot by category (a phone has IMEI and storage; a GPU has VRAM and TDP). Each product has several variants with their own price and stock. We deploy on Vercel (serverless) and want a free tier to start, managed backups and transactions for checkout.

## Decision
Use **MongoDB Atlas** (replica set) with **Mongoose 8**. Embed variants, order packages and shipments; keep **inventory** in its own collection for atomic stock updates. Use multi-document transactions for checkout, cancellation and payment.

## Options considered
| | MongoDB Atlas + Mongoose | PostgreSQL (Neon/Supabase) + Drizzle |
| --- | --- | --- |
| Flexible specs per category | Native (documents) | JSONB, workable |
| Transactions | Yes (replica set) | Yes, stronger |
| Free tier + Vercel integration | Yes | Yes |
| Team familiarity | High | Medium |
| Row-level security | No (enforce in services) | Yes (RLS) |

## Consequences
- Easier: product/spec modelling, fast iteration, one document per order.
- Harder: no RLS — all access control lives in services (covered by tests); joins need aggregation.
- Revisit: Atlas Search for large catalogues; a repository interface keeps a PostgreSQL adapter possible later.
