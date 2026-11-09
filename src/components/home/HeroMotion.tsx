"use client";

import { useEffect } from "react";
import { loadMotion, motion, type MotionKit } from "@/lib/motion/gsap";
import { msSinceSplash, onSplashDone } from "@/lib/motion/splash";

/**
 * GSAP for the home hero (Hero.tsx marks the elements; this renders nothing):
 *  - intro on the first visit, played while the splash fades: copy rises in line by line, the 3D
 *    showcase scales in, the glass cards float in, the stats count up;
 *  - desktop: the glass cards bob gently (only while the hero is on screen) and the hero drifts
 *    apart in layers as you scroll away from it.
 * Coming back to the home page by client navigation skips the intro (content is already there).
 */
const LATE_MS = 600; // GSAP arriving later than this after the splash: skip the intro, no jump

function countUp({ gsap }: MotionKit, el: HTMLElement): void {
  const m = /^(\d+)(.*)$/.exec(el.textContent ?? "");
  if (!m) return;
  const target = Number(m[1]);
  const suffix = m[2] ?? "";
  const n = { v: 0 };
  gsap.to(n, {
    v: target,
    duration: 1.4,
    ease: "power2.out",
    snap: { v: 1 },
    onUpdate: () => {
      el.textContent = `${n.v}${suffix}`;
    },
    onComplete: () => {
      el.textContent = `${target}${suffix}`;
    },
  });
}

function intro(kit: MotionKit, root: HTMLElement): void {
  const { gsap } = kit;
  const tl = gsap.timeline({ defaults: { ease: motion.ease } });
  tl.from(root.querySelectorAll("[data-hero-item]"), {
    y: 32,
    opacity: 0,
    duration: 0.8,
    stagger: 0.08,
    clearProps: "transform,opacity",
  })
    .from(
      root.querySelector("[data-hero-showcase]"),
      {
        scale: 0.92,
        opacity: 0,
        duration: 1.1,
        ease: "power2.out",
        clearProps: "transform,opacity",
      },
      0.1,
    )
    .from(
      root.querySelectorAll("[data-hero-float]"),
      { y: 26, opacity: 0, duration: 0.7, stagger: 0.1, clearProps: "opacity" },
      0.45,
    );
  root.querySelectorAll<HTMLElement>("[data-countup]").forEach((el) => countUp(kit, el));
}

function desktopMotion({ gsap, ScrollTrigger }: MotionKit, root: HTMLElement): void {
  // Idle bob of the glass cards, paused while the hero is off screen.
  const bob = gsap.timeline({ paused: true });
  root.querySelectorAll("[data-hero-float]").forEach((card, i) => {
    // yPercent, not y: the intro animates y on the same cards and the two must not fight.
    bob.to(
      card,
      { yPercent: -7, duration: 2.6 + i * 0.35, ease: "sine.inOut", yoyo: true, repeat: -1 },
      i * 0.4,
    );
  });
  ScrollTrigger.create({
    trigger: root,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => (self.isActive ? bob.play() : bob.pause()),
  });

  // Layers drift apart while scrolling away: background slowest, copy fastest.
  const scrub = { trigger: root, start: "top top", end: "bottom top", scrub: 0.6 };
  root.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    gsap.to(el, { yPercent: Number(el.dataset.parallax) * 100, ease: "none", scrollTrigger: scrub });
  });
}

export function HeroMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-hero]");
    const loading = loadMotion();
    if (!root || !loading) return;
    let ctx: gsap.Context | undefined;
    let cancelled = false;
    let stopWaiting = (): void => undefined;

    void loading.then((kit) => {
      if (cancelled) return;
      ctx = kit.gsap.context(() => {
        const mm = kit.gsap.matchMedia();
        mm.add("(min-width: 1024px)", () => desktopMotion(kit, root));
      }, root);
      // Intro only while the splash is fading (first load). The page can hydrate after the splash
      // started to go, so judge by time, not by whether it already happened; back on the home page
      // through client navigation it's long past, and the content simply stays put.
      stopWaiting = onSplashDone(() => {
        if (msSinceSplash() <= LATE_MS) ctx?.add(() => intro(kit, root));
      });
    });

    return () => {
      cancelled = true;
      stopWaiting();
      ctx?.revert();
    };
  }, []);

  return null;
}
