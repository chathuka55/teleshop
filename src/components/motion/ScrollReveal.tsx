"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { loadMotion, motion, type MotionKit } from "@/lib/motion/gsap";
import { onSplashDone } from "@/lib/motion/splash";

/**
 * Scroll-in animations for any element marked in server components (no client code needed there):
 *   data-reveal            the element rises and fades in when it scrolls into view
 *   data-reveal="stagger"  its direct children do, one after another (grids, lists)
 * Mounted once in the store layout; new content (navigation, streamed sections) is picked up by a
 * MutationObserver. Elements already on screen are left alone, so nothing visible ever blinks;
 * reduced-motion visitors get the plain page. "Hidden" is opacity only, never visibility, so the
 * content stays in the accessibility tree and in find-in-page before it has scrolled in.
 *
 * The first pass waits for the splash and an idle moment: the page streams in its own Suspense
 * boundary and hydrates after this layout, and touching its elements earlier is a hydration
 * mismatch. Prepared elements are remembered here, never marked in the DOM, for the same reason.
 */
const done = new WeakSet<Element>();

const below = (el: Element): boolean => el.getBoundingClientRect().top >= window.innerHeight * 0.92;

function reveal({ gsap, ScrollTrigger }: MotionKit, el: HTMLElement): void {
  done.add(el);
  const from = { y: motion.distance, opacity: 0 };
  const to = {
    y: 0,
    opacity: 1,
    duration: motion.duration,
    ease: motion.ease,
    clearProps: "transform,opacity",
  };
  if (el.dataset.reveal === "stagger") {
    // Per child: in a grid that starts half on screen, only the cards below the fold animate,
    // each row as it scrolls in.
    const items = Array.from(el.children).filter(below);
    if (!items.length) return;
    gsap.set(items, from);
    ScrollTrigger.batch(items, {
      start: "top 94%",
      once: true,
      onEnter: (batch) => gsap.to(batch, { ...to, stagger: motion.stagger }),
    });
    return;
  }
  // Already in view (or above it): animating it now would hide visible content for a moment.
  if (!below(el)) return;
  gsap.fromTo(el, from, { ...to, scrollTrigger: { trigger: el, start: "top 94%", once: true } });
}

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const loading = loadMotion();
    if (!loading) return;
    let observer: MutationObserver | undefined;
    let timer: number | undefined;
    let cancelled = false;
    let stopWaiting = (): void => undefined;
    const settled = new Promise<void>((resolve) => {
      const idle = (): void => {
        if (window.requestIdleCallback) window.requestIdleCallback(() => resolve(), { timeout: 600 });
        else window.setTimeout(resolve, 200);
      };
      stopWaiting = onSplashDone(idle);
    });

    void Promise.all([loading, settled]).then(([kit]) => {
      if (cancelled) return;
      const scan = (): void => {
        document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
          if (!done.has(el)) reveal(kit, el);
        });
        kit.ScrollTrigger.refresh();
      };
      scan();
      observer = new MutationObserver(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(scan, 80);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    return () => {
      cancelled = true;
      stopWaiting();
      observer?.disconnect();
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
