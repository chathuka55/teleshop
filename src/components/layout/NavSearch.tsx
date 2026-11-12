"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const MAX_QUERY = 100; // same cap as the /shop query schema (modules/catalog/schema.ts)

/**
 * Navbar search. Wide screens get a real input; narrow ones a search button that opens a modal
 * <dialog>. ⌘K / Ctrl+K (and "/" outside text fields) jump to search from anywhere.
 * Plain GET form to /shop?q=…, so it also works before hydration / without JS.
 */
export function NavSearch({
  inlineClassName,
  buttonClassName,
}: {
  inlineClassName: string;
  buttonClassName: string;
}) {
  return (
    <Suspense
      fallback={<SearchUI current="" inlineClassName={inlineClassName} buttonClassName={buttonClassName} />}
    >
      <SearchWithParams inlineClassName={inlineClassName} buttonClassName={buttonClassName} />
    </Suspense>
  );
}

function SearchWithParams(props: { inlineClassName: string; buttonClassName: string }) {
  const params = useSearchParams();
  const pathname = usePathname();
  // Show the active search only where results are listed; elsewhere start empty.
  const listing = pathname === "/shop" || pathname.startsWith("/c/") || pathname === "/deals";
  return <SearchUI current={listing ? (params.get("q") ?? "") : ""} {...props} />;
}

function SearchUI({
  current,
  inlineClassName,
  buttonClassName,
}: {
  current: string;
  inlineClassName: string;
  buttonClassName: string;
}) {
  const router = useRouter();
  const inlineRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogInputRef = useRef<HTMLInputElement>(null);
  const [mod, setMod] = useState("⌘");

  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) setMod("Ctrl");
  }, []);

  const openSearch = useCallback(() => {
    const inline = inlineRef.current;
    // The inline field is display:none on some breakpoints — use the dialog there.
    if (inline && inline.offsetParent !== null) {
      inline.focus();
      inline.select();
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    dialogInputRef.current?.focus();
    dialogInputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "")
      .trim()
      .slice(0, MAX_QUERY);
    dialogRef.current?.close();
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <>
      <form
        role="search"
        action="/shop"
        onSubmit={submit}
        className={cn(
          "h-10 w-[280px] items-center gap-2.5 rounded-xl border border-line bg-white/4 pr-2.5 pl-3.5 text-[13px] transition-colors focus-within:border-primary-light/60 hover:border-line-strong",
          inlineClassName,
        )}
      >
        <Search aria-hidden className="size-4 shrink-0 text-text-muted" />
        <input
          key={current}
          ref={inlineRef}
          type="search"
          name="q"
          defaultValue={current}
          maxLength={MAX_QUERY}
          enterKeyHint="search"
          autoComplete="off"
          aria-label="Search products"
          placeholder="Search phones, laptops…"
          className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd
          aria-hidden
          className="rounded-md bg-white/8 px-1.5 py-0.5 font-sans text-[11px] font-semibold whitespace-nowrap text-text-secondary"
        >
          {mod} K
        </kbd>
      </form>

      <Button
        type="button"
        variant="glass"
        size="icon-sm"
        aria-label="Search"
        aria-haspopup="dialog"
        onClick={openSearch}
        className={buttonClassName}
      >
        <Search aria-hidden />
      </Button>

      <dialog
        ref={dialogRef}
        aria-label="Search products"
        // a click on the backdrop lands on the <dialog> itself
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="mx-auto mt-20 w-[min(640px,calc(100%-32px))] max-w-none bg-transparent p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <form
          role="search"
          action="/shop"
          onSubmit={submit}
          className="glass-bar flex h-14 items-center gap-3 rounded-2xl border-white/10 pr-2 pl-4"
        >
          <Search aria-hidden className="size-5 shrink-0 text-text-muted" />
          <input
            key={current}
            ref={dialogInputRef}
            type="search"
            name="q"
            defaultValue={current}
            maxLength={MAX_QUERY}
            enterKeyHint="search"
            autoComplete="off"
            aria-label="Search products"
            placeholder="Search phones, laptops, brands…"
            className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          <Button
            type="button"
            variant="glass"
            size="icon-sm"
            aria-label="Close search"
            onClick={() => dialogRef.current?.close()}
          >
            <X aria-hidden />
          </Button>
        </form>
      </dialog>
    </>
  );
}
