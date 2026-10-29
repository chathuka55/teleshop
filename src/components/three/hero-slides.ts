/** Slides for the home hero (docs/06-3d-hero.md §1). Plain data — safe for server and client. */
export type HeroSlide = {
  id: "phone" | "laptop" | "pc" | "headset";
  label: string;
  caption: string;
  cta: { label: string; href: string };
  /** Compressed GLB in /public/models. `null` = procedural model (gaming PC, fallback phone). */
  modelUrl: string | null;
  /** Lighter copy for phones (512px textures), when the full one is heavy. */
  mobileModelUrl?: string;
};

/** The GLB this device should load for a slide. */
export const modelUrlFor = (slide: HeroSlide, isMobile: boolean): string | null =>
  (isMobile && slide.mobileModelUrl) || slide.modelUrl;

export const heroSlides: readonly HeroSlide[] = [
  {
    id: "phone",
    label: "Smartphones",
    caption: "iPhone 17 Pro · from LKR 389,900",
    cta: { label: "Shop smartphones", href: "/c/mobile-phones" },
    modelUrl: "/models/hero-phone.glb",
    mobileModelUrl: "/models/hero-phone-mobile.glb",
  },
  {
    id: "laptop",
    label: "Laptops",
    caption: "MacBook Pro · M-series power",
    cta: { label: "Shop laptops", href: "/c/laptops" },
    modelUrl: "/models/hero-laptop.glb",
    mobileModelUrl: "/models/hero-laptop-mobile.glb",
  },
  {
    id: "pc",
    label: "PCs & laptops",
    caption: "Gaming rigs · up to 20% off",
    cta: { label: "Shop PC components", href: "/c/pc-components" },
    modelUrl: null,
  },
  {
    id: "headset",
    label: "Audio",
    caption: "Noise-cancelling headsets",
    cta: { label: "Shop audio", href: "/c/audio" },
    modelUrl: "/models/hero-headset.glb",
  },
];

export const SLIDE_INTERVAL_MS = 6000;
