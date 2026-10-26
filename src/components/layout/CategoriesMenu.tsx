"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { CategoryIcon } from "@/components/product/CategoryIcon";
import type { CategoryDTO } from "@/modules/catalog/types";
import { cn } from "@/lib/utils/cn";

/**
 * Desktop "Categories" dropdown: opens on hover or click, closes on Escape, outside click or
 * navigation. Each item goes to its category page (/c/[slug]).
 */
export function CategoriesMenu({
  categories,
  active,
}: {
  categories: readonly CategoryDTO[];
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  /** Pointer type of the last press: a mouse already opened the menu on hover, so its click keeps it open. */
  const pressedWith = useRef<string>("");
  const panelId = useId();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const hoverOpen = (): void => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = (): void => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  return (
    <li
      ref={rootRef}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onPointerDown={(e) => (pressedWith.current = e.pointerType)}
        onClick={(e) => {
          // Keyboard (detail 0) and touch toggle; a mouse click never closes what hover just opened.
          const mouse = e.detail > 0 && pressedWith.current === "mouse";
          setOpen((o) => (mouse ? true : !o));
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-sm transition-colors",
          active || open
            ? "bg-white/8 font-semibold text-text"
            : "font-medium text-text-secondary hover:bg-white/5 hover:text-text",
        )}
      >
        Categories
        <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute top-full left-1/2 z-50 w-[min(560px,90vw)] -translate-x-1/2 pt-3"
      >
        <div className="rounded-[20px] border border-line-strong bg-surface p-2.5 shadow-[0_24px_60px_rgb(0_0_0/0.55)]">
          {categories.length === 0 ? (
            <p className="px-3 py-4 text-sm text-text-secondary">
              Categories are loading — try again shortly.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-1">
              {categories.map((c) => {
                const current = pathname === `/c/${c.slug}`;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/c/${c.slug}`}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                        current ? "bg-primary/15" : "hover:bg-white/5",
                      )}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary/12">
                        <CategoryIcon icon={c.icon} className="size-[18px] text-primary-light" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{c.name}</span>
                        <span className="text-xs text-text-muted">
                          {c.productCount.toLocaleString("en-LK")} products
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/shop"
            className="mt-1.5 flex items-center justify-between rounded-xl border-t border-line px-3 pt-3 pb-2 text-[13px] font-semibold text-primary-light hover:text-text"
          >
            Browse all products
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
    </li>
  );
}
