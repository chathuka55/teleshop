# 3D models for the home hero

Put **optimised** files here (raw sources go in `assets-src/`, git-ignored):

| File | Product | Budget | Status |
| --- | --- | --- | --- |
| `hero-phone.glb` | Smartphone | ≤ 2.5 MB, ≤ 60k tris | Missing — the slider shows a procedural phone until it exists |
| _(procedural)_ | Gaming PC | — | `src/components/three/pc/GamingPC.tsx`, no file needed |
| `hero-headset.glb` | Headphones / headset | ≤ 2.5 MB | 306 KB (meshopt + WebP) |

Optimise (Draco is **not** used — its decoder would load from a CDN that the CSP blocks):

```bash
pnpm exec gltf-transform optimize assets-src/phone/iphone_17_pro.gltf public/models/hero-phone.glb \
  --compress meshopt --texture-compress webp --texture-size 1024
```

Record every model's source and licence in `CREDITS.md`. See `docs/06-3d-hero.md`.
