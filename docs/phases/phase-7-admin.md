# Phase 7 — Admin console

**Goal:** the admin console from Figma A1–A14 and AM1–AM3.

## Notes
- Courier & Tracking panel: courier select → tracking code validated against `codePattern` → preview of the generated link → "Save & mark as Shipped" → notify customer (SMS/email toggles).
- Every admin write is audited.
- Dashboards use aggregation pipelines with indexes; cache 60 s with `unstable_cache` + tags.

## Claude Code prompt
> Implement P7-T02 (orders list + detail + addTrackingCode). Write the service first with tests, then the UI from Figma A3/A4. Plan first.
