"use client";

import { useEffect } from "react";
import { loadMotion, type MotionKit } from "@/lib/motion/gsap";

/**
 * GSAP for the footer (Footer.tsx marks the elements; this renders nothing):
 *  - the giant "TELESHOP" rises and scales in, and the content lifts in, scrubbed to the scroll
 *    while the footer is uncovered;
 *  - [data-magnetic] pills lean towards a mouse pointer (fine pointers only, not touch).
 * GSAP loads on demand when the footer comes near (never for reduced motion — static footer).
 */
export function FooterMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-footer]");
    if (!root) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        void loadMotion()?.then((kit) => {
          if (!cancelled) cleanup = animate(kit, root);
        });
      },
      { rootMargin: "0px 0px 50% 0px" },
    );
    io.observe(root);

    return () => {
      cancelled = true;
      io.disconnect();
      cleanup?.();
    };
  }, []);
  return null;
}

function animate({ gsap }: MotionKit, root: HTMLElement): () => void {
  const ctx = gsap.context(() => {
    // Already fully on screen (short page): leave everything where it is, no jump.
    if (root.getBoundingClientRect().top < window.innerHeight * 0.5) return;

    const giant = root.querySelector("[data-footer-giant]");
    if (giant) {
      gsap.fromTo(
        giant,
        { yPercent: 25, scale: 0.85, opacity: 0 },
        {
          yPercent: 0,
          scale: 1,
          opacity: 1,
          ease: "power1.out",
          scrollTrigger: { trigger: root, start: "top 85%", end: "bottom bottom", scrub: 1 },
        },
      );
    }
    gsap.fromTo(
      root.querySelectorAll("[data-footer-reveal]"),
      { y: 48, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: root, start: "top 75%", end: "top 15%", scrub: 1 },
      },
    );
  }, root);

  const offMagnetic = window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ? magnetic(gsap, root)
    : undefined;

  return () => {
    offMagnetic?.();
    ctx.revert();
  };
}

function magnetic(gsap: MotionKit["gsap"], root: HTMLElement): () => void {
  const offs = [...root.querySelectorAll<HTMLElement>("[data-magnetic]")].map((el) => {
    const move = (e: PointerEvent): void => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      gsap.to(el, { x: x * 0.3, y: y * 0.3, scale: 1.04, duration: 0.4, ease: "power2.out" });
    };
    const leave = (): void => {
      gsap.to(el, { x: 0, y: 0, scale: 1, duration: 1.1, ease: "elastic.out(1, 0.35)" });
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      gsap.set(el, { clearProps: "transform" });
    };
  });
  return () => offs.forEach((off) => off());
}
