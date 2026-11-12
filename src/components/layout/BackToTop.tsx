"use client";

import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Footer "back to top" (smooth, unless the visitor prefers reduced motion). */
export function BackToTop({ className }: { className?: string }) {
  return (
    <button
      type="button"
      data-magnetic
      aria-label="Back to top"
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        document.getElementById("main")?.focus({ preventScroll: true });
      }}
      className={cn(
        "footer-pill group grid size-12 place-items-center rounded-full text-text-secondary",
        className,
      )}
    >
      <ArrowUp aria-hidden className="size-5 transition-transform duration-300 group-hover:-translate-y-1" />
    </button>
  );
}
