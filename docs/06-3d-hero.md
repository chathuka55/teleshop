# 3D hero — product model slider

**DOC-06** · Related: [ADR-004](adr/ADR-004-3d-hero.md) · Component: `src/components/three/HeroModelSlider.tsx`

## 1. What it does
The home page hero has the headline and buttons on the left. On the right, the phone placeholder from the Figma design is replaced by a **3D slider** that shows four products one at a time:

| Slide | File | Caption |
| --- | --- | --- |
| 1 | `public/models/hero-phone.glb` (iPhone 17 Pro, CC BY 4.0) | Smartphones — "iPhone 17 Pro · from LKR 389,900" |
| 2 | `public/models/hero-laptop.glb` (MacBook Pro M3, CC BY 4.0) | Laptops — "MacBook Pro · M-series power" |
| 3 | _procedural_ — `src/components/three/pc/*` (RGB gaming PC, no file) | PCs & laptops — "Gaming rigs · up to 20% off" |
| 4 | `public/models/hero-headset.glb` | Audio — "Noise-cancelling headsets" |

The model slowly rotates, can be dragged (desktop) or swiped (phone), and the slide changes every 6 seconds with a slide-in from the right. The glass floating cards (Verified Sellers, COD, price card) stay on top in normal HTML.

> **Status (2026-10-26).** Implemented in `HeroModelSlider.tsx` + `HeroScene.tsx`. Phone (1.6 MB) and laptop
> (0.9 MB) are Sketchfab CC BY 4.0 models, credited in `public/models/CREDITS.md` and on `/credits`; raw sources stay
> in `assets-src/models/` (git-ignored). `ProceduralPhone` is only the error fallback. The PC is built in code
> (RGB recoloured to primary → amber); `hero-headset.glb` is 306 KB. Models are normalised with `FitToSize` (largest
> side = slide size, `SLIDE_SIZE`) and posed with `SLIDE_ROTATION`. Each slide has its own Suspense boundary: the
> HTML phone mockup (server-rendered poster, LCP) stays up until the first frame that actually shows a model.

## 2. Asset rules
- Format: **.glb** (binary glTF 2.0). One model per file, origin at the centre, Y up, real-world scale ≈ 1 unit = 10 cm.
- Budget per model: **≤ 2.5 MB** after compression, ≤ 60k triangles, textures ≤ 2048 px (1024 px for the phone build).
- Compress with gltf-transform before committing (raw sources go in `assets-src/`, which is git-ignored).
  Use **meshopt, not Draco**: drei loads the Draco decoder from a CDN, which the CSP blocks. Meshopt decodes with
  WebAssembly, so the CSP allows `'wasm-unsafe-eval'` (WASM only, not JS eval) and `blob:` in `connect-src`
  (GLTFLoader fetches embedded textures through blob URLs).

```bash
pnpm dlx @gltf-transform/cli optimize assets-src/phone.glb public/models/hero-phone.glb \
  --compress meshopt --texture-compress webp --texture-size 2048
```

- Licence: only use models you made, bought or that have a licence allowing commercial use. Record source + licence in `public/models/CREDITS.md`.
- Poster images: `public/images/placeholders/hero-phone.webp`, `hero-pc.webp`, `hero-headset.webp` (shown while loading and on low-power devices).

## 3. How it loads (performance)
1. The hero renders on the server with the **poster image** in the slider slot (fast LCP).
2. `HeroModelSlider` is imported with `next/dynamic(() => import(...), { ssr: false })`.
3. It mounts only when the hero is visible (IntersectionObserver) and the browser is idle.
4. Only the **current** model is loaded; only the **next** slide's model is preloaded (`useGLTF.preload`, 1.5 s after a slide appears) — never all of them at once.
5. Rendering pauses when the hero is off-screen or the tab is hidden (`frameloop="demand"` + `invalidate()` on interaction).
6. On phones (< 768 px): `dpr={[1, 1.5]}`, no antialias, no shadows, no bloom (its post-processing code is a separate chunk phones never download), smaller environment map, and the `*-mobile.glb` models (512 px textures — `modelUrlFor()` in `hero-slides.ts`). WebGL mounts only after window `load` + idle. If `navigator.hardwareConcurrency <= 4`, `deviceMemory < 4`, `saveData` is on or the connection is 2G/3G, keep the poster image and skip WebGL.
7. `prefers-reduced-motion`: no auto-rotate, no auto-advance.

## 4. Component outline

```tsx
// src/components/three/HeroModelSlider.tsx  ("use client")
// Canvas → Suspense(fallback=<Poster/>) → Stage(env, contact shadow) → <Model url={slides[i].url} />
// Controls: PresentationControls (drag/swipe), dots + arrows (HTML, keyboard accessible)
// State: index, isVisible, reducedMotion, lowPower
```

Libraries: `three`, `@react-three/fiber`, `@react-three/drei` (`useGLTF`, `Environment`, `ContactShadows`, `PresentationControls`, `Float`). Pin versions that support React 19.

## 5. Accessibility
- The canvas has `aria-hidden="true"`; each slide has a visible caption and an HTML link ("Shop smartphones").
- Dots are buttons with `aria-label="Show slide 2 of 3: PCs & laptops"`; arrow keys change slides when focused.

## 6. Acceptance check (task P3-T03)
- Lighthouse mobile: LCP < 2.5 s with the hero, total JS for `/` < 250 KB gzip excluding the lazily loaded 3D chunk.
- 3D chunk loads only after the hero is visible; switching tabs stops the render loop.
- Works on Chrome/Safari/Firefox desktop, Safari iOS 17+, Chrome Android.
