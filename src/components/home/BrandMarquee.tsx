"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { loadMotion } from "@/lib/motion/gsap";

/**
 * One endless row of brand tiles (GSAP). The tiles are rendered twice and the track slides by half
 * its width, so the loop never shows a seam. Scrolling the page pushes it faster, in the direction
 * you scroll; hovering or keyboard focus slows it to a stop so a logo can be clicked. Off screen it
 * pauses. With reduced motion (or before GSAP loads) it is a plain wrapped row, without the copy.
 */
export function BrandMarquee({
  children,
  reverse = false,
  seconds = 38,
}: {
  children: ReactNode;
  /** slide left → right */
  reverse?: boolean;
  /** time for one full loop at rest */
  seconds?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loading = loadMotion();
    const root = rootRef.current;
    const track = trackRef.current;
    if (!loading || !root || !track) return;
    let revert = (): void => undefined;
    let cancelled = false;

    void loading.then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      const ctx = gsap.context(() => {
        const loop = gsap.fromTo(
          track,
          { xPercent: reverse ? -50 : 0 },
          { xPercent: reverse ? 0 : -50, duration: seconds, ease: "none", repeat: -1 },
        );
        let hold = false; // hovered / focused
        const settle = (): void => {
          gsap.to(loop, {
            timeScale: hold ? 0 : 1,
            duration: hold ? 0.5 : 1.2,
            ease: "power2.out",
            overwrite: true,
          });
        };
        // Back to the resting speed shortly after the page stops scrolling.
        const settleLater = gsap.delayedCall(0.25, settle).pause();

        ScrollTrigger.create({
          trigger: root,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
          onUpdate: (self) => {
            if (hold) return;
            // Scroll speed in px/s → up to 5× faster; scrolling up runs the row backwards.
            const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 350, 4);
            gsap.to(loop, { timeScale: self.direction * boost, duration: 0.2, overwrite: true });
            settleLater.restart(true);
          },
        });

        const stop = (): void => {
          hold = true;
          settle();
        };
        const go = (): void => {
          hold = false;
          settle();
        };
        root.addEventListener("pointerenter", stop);
        root.addEventListener("pointerleave", go);
        root.addEventListener("focusin", stop);
        root.addEventListener("focusout", go);
        return () => {
          root.removeEventListener("pointerenter", stop);
          root.removeEventListener("pointerleave", go);
          root.removeEventListener("focusin", stop);
          root.removeEventListener("focusout", go);
        };
      }, root);
      revert = () => ctx.revert();
    });

    return () => {
      cancelled = true;
      revert();
    };
  }, [reverse, seconds]);

  return (
    <div ref={rootRef} className="overflow-hidden motion-reduce:overflow-visible">
      <div
        ref={trackRef}
        className="flex w-max motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:justify-center"
      >
        <div className="flex gap-3 pr-3 motion-reduce:flex-wrap motion-reduce:justify-center md:gap-4 md:pr-4">
          {children}
        </div>
        {/* The copy that makes the loop seamless: not read out, not focusable. */}
        <div aria-hidden inert className="flex gap-3 pr-3 motion-reduce:hidden md:gap-4 md:pr-4">
          {children}
        </div>
      </div>
    </div>
  );
}
