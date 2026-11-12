"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { onSplashDone } from "@/lib/motion/splash";
import { cn } from "@/lib/utils/cn";
import { isSoftwareRenderer } from "@/lib/utils/webgl";
import { heroSlides, modelUrlFor, SLIDE_INTERVAL_MS } from "./hero-slides";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false, loading: () => null });

/** About as long as the hero intro (HeroMotion) runs after the splash fades. */
const INTRO_MS = 1600;

/**
 * Soft edges for the WebGL layer. The ground shadow and the bloom glow are drawn on a rectangular
 * canvas; without this they stop dead at its border and the canvas shows as a faint box around the
 * model. Fading every edge to transparent lets them melt into the page instead.
 */
const fadeEdges: CSSProperties = {
  maskImage:
    "linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 8%, #000 80%, transparent 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 8%, #000 80%, transparent 100%)",
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

type NavigatorWithHints = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
};

/**
 * Devices and connections that skip the 3D scene (the slider keeps its captions and controls).
 * Ordinary phones (4–8 cores, 3–4 GB) DO get 3D — the phone models are ~0.3 MB each and the
 * mobile scene skips shadows and bloom; only data saver, 2G, ≤ 2 GB memory, no WebGL or a
 * software renderer skip it.
 */
function detectLowPower(): boolean {
  const nav = navigator as NavigatorWithHints;
  if (nav.connection?.saveData) return true;
  if (/(^|-)2g$/.test(nav.connection?.effectiveType ?? "")) return true;
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return true;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    if (!gl) return true;
    // No GPU (blocklisted driver, VM, remote desktop, headless): the browser falls back to a CPU
    // rasteriser, and compiling the scene's shaders there blocks the main thread for seconds.
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return isSoftwareRenderer(renderer);
  } catch {
    return true;
  }
}

/**
 * Home hero 3D slider (docs/06-3d-hero.md): 3D models only — a soft glow marks the spot while a
 * model loads. The WebGL scene mounts once the slider is on screen and the browser is idle, fades
 * in, and stops rendering when off-screen or the tab is hidden.
 */
export function HeroModelSlider({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [mount3d, setMount3d] = useState(false);
  const [ready, setReady] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [inView, setInView] = useState(false);
  const [nearScreen, setNearScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [paused, setPaused] = useState(false);

  const count = heroSlides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  // Motion + device hints
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 767px)");
    const sync = (): void => {
      setReducedMotion(mq.matches);
      setIsMobile(mobile.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    mobile.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      mobile.removeEventListener("change", sync);
    };
  }, []);

  // Visibility of the hero + the tab
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setOnScreen(!!entry?.isIntersecting && entry.intersectionRatio >= 0.15);
        // WebGL set-up starts once the slider is mostly in view (a peek at the fold is not enough).
        if (entry && entry.intersectionRatio >= 0.4) setInView(true);
      },
      {
        threshold: [0, 0.15, 0.4],
      },
    );
    io.observe(el);
    // Start the 3D download a screen ahead: on phones the slider sits below the hero copy.
    const near = new IntersectionObserver(([entry]) => entry?.isIntersecting && setNearScreen(true), {
      rootMargin: "0px 0px 100% 0px",
    });
    near.observe(el);
    const onVis = (): void => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      near.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Two steps, both only after page load + splash + hero intro, and never on low-power devices:
  //  1. "warm": the slider is within a screen → download the current model (a plain fetch into the
  //     HTTP cache — no main-thread cost; importing the 3D code here would evaluate three.js and
  //     block a phone for seconds), so phones (slider below the hero copy) have it ready.
  //  2. mount: the slider is ≥ 40 % in view + the browser is idle → set up WebGL. That step
  //     (shaders, model decoding) does block the main thread for a moment, so it waits until it is
  //     worth it and never stutters the GSAP intro (HeroMotion) or the first scroll.
  const [warm, setWarm] = useState(false);
  const slideRef = useRef(index);
  useEffect(() => {
    slideRef.current = index;
  }, [index]);
  useEffect(() => {
    if (warm || !nearScreen) return;
    if (detectLowPower()) return;
    let afterIntro: number | undefined;
    const go = (): void => {
      setWarm(true);
      const slide = heroSlides[slideRef.current];
      const url = slide && modelUrlFor(slide, isMobile);
      if (url) void fetch(url, { priority: "low" } as RequestInit).catch(() => undefined);
    };
    const whenLoaded = (): void => {
      if (document.readyState === "complete") go();
      else window.addEventListener("load", go, { once: true });
    };
    const stopWaiting = onSplashDone(() => {
      afterIntro = window.setTimeout(whenLoaded, INTRO_MS);
    });
    return () => {
      stopWaiting();
      window.clearTimeout(afterIntro);
      window.removeEventListener("load", go);
    };
  }, [nearScreen, warm, isMobile]);

  useEffect(() => {
    if (mount3d || !warm || !inView) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (!w.requestIdleCallback) {
      const timer = window.setTimeout(() => setMount3d(true), 300);
      return () => window.clearTimeout(timer);
    }
    const idle = w.requestIdleCallback(() => setMount3d(true), { timeout: 2000 });
    return () => w.cancelIdleCallback?.(idle);
  }, [warm, inView, mount3d]);

  // Auto-advance every 6 s (not with reduced motion, not while hovered/focused, not off-screen)
  const active = onScreen && tabVisible;
  useEffect(() => {
    if (reducedMotion || paused || !active) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [reducedMotion, paused, active, count]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
    else return;
    e.preventDefault();
  };

  const slide = heroSlides[index] ?? heroSlides[0];

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured products"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* While the model loads: a soft pulsing glow where it will appear (no placeholder art) */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 bottom-[96px] grid place-items-center transition-opacity duration-700",
          ready ? "opacity-0" : "opacity-100",
        )}
      >
        <span className="size-28 animate-pulse rounded-full bg-primary-light/25 blur-2xl md:size-40" />
      </div>

      {mount3d && (
        <div
          className={cn(
            // phones: stop above the caption so the model never covers it
            "absolute inset-x-0 top-0 bottom-[84px] transition-opacity duration-700 ease-out md:bottom-0",
            ready ? "opacity-100" : "opacity-0",
          )}
          style={fadeEdges}
        >
          <HeroScene
            index={index}
            active={active}
            reducedMotion={reducedMotion}
            isMobile={isMobile}
            onReady={() => setReady(true)}
          />
        </div>
      )}

      {/* Caption + controls (HTML, keyboard accessible) */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3"
        onKeyDown={onKeyDown}
      >
        {slide && (
          <p aria-live="polite" className="text-center text-[13px] text-text-secondary">
            <span className="font-semibold text-text">{slide.label}</span> — {slide.caption}{" "}
            <Link
              href={slide.cta.href}
              className="inline-flex items-center gap-1 font-semibold text-primary-light hover:text-text"
            >
              {slide.cta.label}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </p>
        )}
        <div className="glass flex items-center gap-1 rounded-full p-1">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="grid size-9 place-items-center rounded-full text-text-secondary hover:bg-white/8 hover:text-text"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          {heroSlides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show slide ${i + 1} of ${count}: ${s.label}`}
              aria-current={i === index ? "true" : undefined}
              className="grid h-9 w-7 place-items-center"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-5 bg-primary-light" : "w-1.5 bg-white/25",
                )}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="grid size-9 place-items-center rounded-full text-text-secondary hover:bg-white/8 hover:text-text"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
