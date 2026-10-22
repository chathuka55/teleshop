# Design system — Midnight Tech (dark)

**DOC-05** · Source of truth: Figma file *Teleshop E-Commerce Website* → page *00 · Design System* and the **Teleshop Colors** variable collection.

## 1. Colour tokens
Copy these into `src/styles/tokens.css`. Names match the Figma variables (`color/<name>`).

```css
:root {
  --color-bg: #0A0D14;
  --color-surface: #141922;
  --color-surface-2: #1C2230;
  --color-surface-deep: #0B1120;
  --color-text: #F9FAFB;
  --color-text-secondary: #9CA3AF;
  --color-text-muted: #848C9A;   /* Figma #6B7280 fails AA (3.3–4.0:1) on our surfaces — raised; update the Figma variable */
  --color-primary: #1D4ED8;      /* buttons, active states */
  --color-primary-light: #3B82F6;/* links, charts, glows */
  --color-primary-soft: #60A5FA; /* small blue text on tinted / glass backgrounds (badges, active tab) */
  --color-primary-strong: #2563EB;/* end stop of the primary button gradient */
  --color-accent: #F59E0B;       /* deals, tracking codes, highlights */
  --color-success: #22C55E;
  --color-danger: #EF4444;
  --color-on-primary: #FFFFFF;

  --glass-fill: rgb(255 255 255 / 0.06);
  --glass-border: rgb(255 255 255 / 0.12);
  --glass-blur: 24px;
  --radius-sm: 10px; --radius-md: 14px; --radius-lg: 20px; --radius-xl: 28px;
}
```

Rules: every text colour must pass 4.5:1 on `surface-2` (checked by axe in `tests/e2e`). No violet, cyan or pink. Amber is for highlights, never for long text. Body text on dark uses `--color-text` / `--color-text-secondary` only.

## 2. Glassmorphism
Use glass **only** for the floating navbar, hero cards, announcement pill, trust strip, modals/sheets and mobile bottom bars.

```css
.glass {
  background: var(--glass-fill);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  box-shadow: 0 16px 40px rgb(0 0 0 / 0.35);
}
@supports not (backdrop-filter: blur(1px)) { .glass { background: rgb(20 25 34 / 0.92); } }
```

## 3. Typography
- Headings: **Space Grotesk** (600/700). Body/UI: **Inter** (400/500/600). Load with `next/font` (self-hosted, no layout shift).
- Scale: 12 · 13 · 14 · 16 · 18 · 20 · 26 · 38 · 56 · 70 (hero).
- Line length ≤ 72 characters for body text.

## 4. Components (from Figma)
Navbar (Guest / Logged in variants), Footer, Button (primary / glass / outline / danger / small), Badge (status colours), ProductCard, CategoryTile, VariantPicker, SpecTable, Stepper, Timeline, TrackingCodeBox (copy button + courier link), Tables, Sidebars (Account / Admin / Seller), BottomTabBar (mobile), BottomSheet.

## 5. React Bits and ThreeUI — how we use them

| Library | Install | Use for | Rule |
| --- | --- | --- | --- |
| **React Bits** (reactbits.dev) | Copy the component source (or `npx shadcn add` from its registry) into `src/components/ui/bits/` | Animated headline text, spotlight cards, subtle background effects, count-up stats | Wrap each in our own component (e.g. `AnimatedHeadline`) so it can be swapped. Respect `prefers-reduced-motion`. |
| **ThreeUI Community** (threeui.com, npm `@designcodeio/threeui`, MIT) | `pnpm add @designcodeio/threeui` and import components individually | Optional 3D/shader backgrounds behind the hero or section dividers | Client-only (`next/dynamic`, `ssr:false`), one effect per page, pause off-screen. Copy runtime assets it needs from `node_modules/@designcodeio/threeui/lib-dist/assets/` into `public/`. Pro components need a paid licence — do not commit Pro source. |

Check each component's licence before copying, and record it in `src/components/ui/bits/LICENSES.md`.

## 6. Motion and accessibility
- Durations 150–300 ms, ease-out. No animation over 600 ms on interactive elements.
- `@media (prefers-reduced-motion: reduce)` turns off auto-rotation, parallax and text effects.
- Contrast: text ≥ 4.5:1, large text ≥ 3:1. Focus ring: 2px `--color-primary-light` + 2px offset.
- Touch targets ≥ 44×44 px on phones.
