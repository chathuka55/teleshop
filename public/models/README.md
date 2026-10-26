# 3D models for the home hero

Put **optimised** files here (raw sources go in `assets-src/`, git-ignored):

| File | Product | Budget | Status |
| --- | --- | --- | --- |
| `hero-phone.glb` | Smartphone (iPhone 17 Pro) | ≤ 2.5 MB, ≤ 60k tris | 1.6 MB (meshopt + WebP 768) — procedural phone only as error fallback |
| `hero-laptop.glb` | Laptop (MacBook Pro M3) | ≤ 2.5 MB | 0.9 MB (meshopt + WebP 1024) |
| _(procedural)_ | Gaming PC | — | `src/components/three/pc/GamingPC.tsx`, no file needed |
| `hero-headset.glb` | Headphones / headset | ≤ 2.5 MB | 306 KB (meshopt + WebP) |

Optimise (Draco is **not** used — its decoder would load from a CDN that the CSP blocks):

```bash
pnpm exec gltf-transform optimize assets-src/models/iphone_17_pro.glb public/models/hero-phone.glb   --compress meshopt --texture-compress webp --texture-size 768
pnpm exec gltf-transform optimize assets-src/models/macbook_pro_m3.glb public/models/hero-laptop.glb   --compress meshopt --texture-compress webp --texture-size 1024
```

Record every model's source and licence in `CREDITS.md`. See `docs/06-3d-hero.md`.
