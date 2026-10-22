# Phase 3 — Storefront

**Goal:** the public site from the Figma Frontend page (01–03, 14–20) on desktop and mobile, including the 3D hero.

## Notes
- Server Components for listing/product pages; client components only for filters, variant picker, gallery, cart button, 3D.
- Filters are URL search params (shareable, cache-friendly). Build filter UI from `category.specTemplate` (`filterable: true`).
- Product page: `generateStaticParams` for top products + ISR; `revalidateTag(productTag(id))` on edit.
- 3D hero: follow [doc 06](../06-3d-hero.md) exactly (poster first, lazy, pause off-screen, mobile limits).
- React Bits for the headline/count-up effects; optional ThreeUI background behind the hero (one effect only).

## Claude Code prompt
> Read CLAUDE.md, docs/05-design-system.md and docs/06-3d-hero.md. Implement P3-T03: HeroModelSlider with the three GLB files in public/models (use placeholder cubes if a file is missing). Measure the JS added to `/` and report it. Plan first.
