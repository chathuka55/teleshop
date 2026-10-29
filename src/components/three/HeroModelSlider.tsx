"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { heroSlides, SLIDE_INTERVAL_MS } from "./hero-slides";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false, loading: () => null });

type NavigatorWithHints = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
};

/** Devices and connections that keep the still poster instead of downloading the 3D scene. */
function detectLowPower(): boolean {
  const nav = navigator as NavigatorWithHints;
  if (nav.connection?.saveData) return true;
  if (/(^|-)2g$|^3g$/.test(nav.connection?.effectiveType ?? "")) return true;
  if ((nav.hardwareConcurrency ?? 8) <= 4) return true;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return true;
  try {
    const c = document.createElement("canvas");
    return !(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return true;
  }
}

/**
 * Home hero 3D slider (docs/06-3d-hero.md). The server-rendered `poster` is the LCP element;
 * the WebGL scene mounts only once the hero is visible and the browser is idle, fades in over
 * the poster, and stops rendering when off-screen or the tab is hidden.
 */
export function HeroModelSlider({ poster, className }: { poster: ReactNode; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [mount3d, setMount3d] = useState(false);
  const [ready, setReady] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
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
    const io = new IntersectionObserver(([entry]) => setOnScreen(!!entry?.isIntersecting), {
      threshold: 0.15,
    });
    io.observe(el);
    const onVis = (): void => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Mount WebGL lazily: page fully loaded + hero visible + idle + not a low-power device. Phones
  // wait longer for idle so the 3D download never competes with the page itself.
  useEffect(() => {
    if (mount3d || !onScreen) return;
    if (detectLowPower()) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idle: number | undefined;
    let timer: number | undefined;
    const start = (): void => {
      if (w.requestIdleCallback) {
        idle = w.requestIdleCallback(() => setMount3d(true), { timeout: isMobile ? 4000 : 2000 });
      } else timer = window.setTimeout(() => setMount3d(true), 800);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (idle !== undefined) w.cancelIdleCallback?.(idle);
      window.clearTimeout(timer);
    };
  }, [onScreen, mount3d, isMobile]);

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
  const showPoster = !ready;

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
      {/* Poster: server-rendered, visible until the first 3D frame */}
      <div
        aria-hidden={ready}
        className={cn(
          "absolute inset-0 transition-opacity duration-500 ease-out",
          showPoster ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {poster}
      </div>

      {mount3d && (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            ready ? "opacity-100" : "opacity-0",
          )}
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
