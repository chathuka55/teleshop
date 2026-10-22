# Phase 8 — Hardening

**Goal:** prove the app is secure, fast and accessible before launch.

## Steps
1. Run `/code-review` per module and fix findings; tick doc 10 §3 for every write path.
2. `@next/bundle-analyzer`: home < 250 KB gzip JS (excluding lazy 3D chunk).
3. Lighthouse CI budgets in CI; GLB ≤ 2.5 MB each.
4. Playwright full suite + axe on preview deploys.
5. Sentry with PII scrubbing; custom error pages.
