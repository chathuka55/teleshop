# 3D hero — product model slider

**DOC-06** · Related: [ADR-004](adr/ADR-004-3d-hero.md) · Component: `src/components/three/HeroModelSlider.tsx`

## 1. What it does
The home page hero has the headline and buttons on the left. On the right, the phone placeholder from the Figma design is replaced by a **3D slider** that shows three products one at a time:

| Slide | File | Caption |
| --- | --- | --- |
| 1 | `public/models/hero-phone.glb` | Smartphones — "iPhone 17 Pro · from LKR 389,900" |
| 2 | _procedural_ — `src/components/three/pc/*` (RGB gaming PC, no file) | PCs & laptops — "Gaming rigs · up to 20% off" |
| 3 | `public/models/hero-headset.glb` | Audio — "Noise-cancelling headsets" |

The model slowly rotates, can be dragged (desktop) or swiped (phone), and the slide changes every 6 seconds with a slide-in from the right. The glass floating cards (Verified Sellers, COD, price card) stay on top in normal HTML.

> **Status (2026-10-22).** Implemented in `HeroModelSlider.tsx` + `HeroScene.tsx`. The PC is built in code
> (ported from the in-house "animated-3d-gaming-pc" sample, RGB recoloured to primary → amber). `hero-headset.glb` is
> optimised (306 KB). `hero-phone.glb` is not in the repo yet — the slide shows `ProceduralPhone` until it is, then
> set `modelUrl` in `hero-slides.ts`. Models are normalised with `FitToSize` (largest side = slide size).
> The HTML phone mockup from Figma is the server-rendered poster (LCP); the canvas fades in over it.

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
4. Only the **current** model is loaded; the next one is preloaded with `useGLTF.preload` after the first is shown.
5. Rendering pauses when the hero is off-screen or the tab is hidden (`frameloop="demand"` + `invalidate()` on interaction).
6. On phones: `dpr={[1, 1.5]}`, no shadows, smaller environment map. If `navigator.hardwareConcurrency <= 4` or `saveData` is on, keep the poster image and skip WebGL.
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
