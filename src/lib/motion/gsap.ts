"use client";

import type { gsap as Gsap } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

/**
 * GSAP + ScrollTrigger, loaded on demand (its own chunk, after the page is interactive) so the
 * animations never slow down the first paint. Every caller shares one load. Nothing is loaded for
 * visitors who ask for reduced motion (docs/05 §6): they get the static page.
 */
export type MotionKit = { gsap: typeof Gsap; ScrollTrigger: typeof ScrollTriggerType };

let kit: Promise<MotionKit> | null = null;

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function loadMotion(): Promise<MotionKit> | null {
  if (prefersReducedMotion()) return null;
  kit ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([g, st]) => {
    g.gsap.registerPlugin(st.ScrollTrigger);
    // Phones: address-bar show/hide resizes the viewport; don't recalculate every trigger for it.
    st.ScrollTrigger.config({ ignoreMobileResize: true });
    return { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger };
  });
  return kit;
}

/** Shared easing/timing so every reveal feels like the same system. */
export const motion = {
  ease: "power3.out",
  duration: 0.7,
  stagger: 0.07,
  distance: 28,
} as const;
