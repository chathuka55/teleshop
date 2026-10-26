"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";

/** Keep the splash up at least this long so it never flashes for a few frames. */
const MIN_VISIBLE_MS = 500;
/** Fade-out length — matches the `.splash` transition in src/styles/splash.css. */
const FADE_MS = 450;

/**
 * Branded loading screen for the first full page load. Server-rendered, so it covers the page
 * before any JS runs; it fades out once the window `load` event fires (fonts, images, CSS ready).
 * Lives in the root layout, so client-side navigations never show it again.
 */
export function SplashScreen() {
  const [state, setState] = useState<"loading" | "done" | "gone">("loading");

  useEffect(() => {
    const started = performance.now();
    let fadeTimer: number | undefined;
    let removeTimer: number | undefined;
    const finish = (): void => {
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - started));
      fadeTimer = window.setTimeout(() => {
        setState("done");
        removeTimer = window.setTimeout(() => setState("gone"), FADE_MS);
      }, wait);
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (state === "gone") return null;

  return (
    <div
      className="splash"
      data-state={state}
      role="status"
      aria-live="polite"
      aria-busy={state === "loading"}
    >
      <div className="flex flex-col items-center gap-6">
        <Image src={siteConfig.logo.mark} alt="" width={72} height={72} priority className="splash-mark" />
        <p className="font-display text-[26px] font-bold tracking-[-0.01em]">
          <span className="text-text">Tele</span>
          <span className="text-gradient-primary">shop</span>
        </p>
        <div className="splash-bar" />
        <span className="sr-only">Loading Teleshop…</span>
      </div>
    </div>
  );
}
