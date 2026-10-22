# ADR-004: React Three Fiber GLB slider for the home hero

**Status:** Accepted · **Date:** 2026-10

## Context
The hero should show real products (phone, PC, headset) in 3D on desktop and phones without hurting load time.

## Decision
Use **@react-three/fiber + @react-three/drei** with **compressed GLB** files (meshopt + WebP, ≤ 2.5 MB each), loaded lazily on the client after a server-rendered poster image. ThreeUI (MIT community components) may be used for an optional background effect, not for the product models.

## Consequences
- Easier: full control of models, lighting and interaction; good React integration.
- Harder: WebGL cost on low-end phones — mitigated by poster fallback, DPR limits, pausing off-screen and a low-power mode.
