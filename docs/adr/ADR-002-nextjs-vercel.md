# ADR-002: Next.js 15 App Router on Vercel, one app for store + seller + admin

**Status:** Accepted · **Date:** 2026-10

## Context
Small team, needs SEO for product pages, fast first load on phones, and three areas (store, seller, admin) sharing the same data and auth.

## Decision
One **Next.js 15 App Router** app deployed on **Vercel**. Server Components by default, Server Actions for forms, a small `/api/v1` for JSON clients. Route groups separate areas; middleware guards them.

## Consequences
- Easier: one deploy, shared auth/session, ISR for product pages, preview deploys per PR.
- Harder: admin and store share a bundle graph — keep admin code in its own route segments so it never loads on the store.
- Revisit: split admin into its own Vercel project if it grows large.
