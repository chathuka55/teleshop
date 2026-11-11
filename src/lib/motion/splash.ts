"use client";

/**
 * The first-load splash tells intro animations when it starts fading (SplashScreen.tsx), so they
 * play as the page is revealed instead of behind the splash. A flag on <html> lets components that
 * mount later know it already happened.
 */
const EVENT = "teleshop:splash-done";
let doneAt: number | null = null;

export function markSplashDone(): void {
  if (document.documentElement.dataset.splash === "done") return;
  doneAt = performance.now();
  document.documentElement.dataset.splash = "done";
  window.dispatchEvent(new Event(EVENT));
}

export function isSplashDone(): boolean {
  return document.documentElement.dataset.splash === "done";
}

/** Milliseconds since the splash started fading (Infinity before it has). */
export function msSinceSplash(): number {
  return doneAt === null ? Number.POSITIVE_INFINITY : performance.now() - doneAt;
}

/** Calls `cb` when the splash starts fading. Returns the cleanup. */
export function onSplashDone(cb: () => void): () => void {
  if (isSplashDone()) {
    cb();
    return () => undefined;
  }
  window.addEventListener(EVENT, cb, { once: true });
  return () => window.removeEventListener(EVENT, cb);
}
