# Phase 9 — Launch

**Goal:** go live safely. Follow [doc 12](../12-deployment.md) step by step.

## Steps
1. Create production Atlas project + M10 cluster, users, network, backups, alerts.
2. Set Vercel Production env vars, domain, firewall, function region.
3. Run migrations with the migrator user from CI; seed couriers + categories.
4. Smoke test (doc 12 §4) and a rollback drill (doc 12 §5).
5. Onboard the first 5 sellers; monitor for 7 days.
