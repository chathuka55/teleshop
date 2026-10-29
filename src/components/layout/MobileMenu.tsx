"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Flame,
  Heart,
  House,
  Info,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Store,
  Truck,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { CategoryIcon } from "@/components/product/CategoryIcon";
import { Badge } from "@/components/ui/Badge";
import { DEALS_HREF, isNavActive, mainNav } from "@/config/site";
import { signOutAction } from "@/modules/auth/actions";
import type { CategoryDTO } from "@/modules/catalog/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { initials } from "@/lib/utils/strings";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./Logo";
import type { NavUser } from "./types";

type DrawerLink = { label: string; href: string; icon: LucideIcon; hot?: boolean; navLabel?: string };

const navMatch = (label: string) => mainNav.find((l) => l.label === label)?.match;

const topLinks: readonly DrawerLink[] = [
  { label: "Home", href: "/", icon: House },
  { label: "Shop all products", href: "/shop", icon: LayoutGrid, navLabel: "Shop" },
];

const bottomLinks: readonly DrawerLink[] = [
  { label: "Deals", href: DEALS_HREF, icon: Flame, hot: true },
  { label: "Sellers", href: "/sellers", icon: Store },
  { label: "Track an order", href: "/track", icon: Truck },
  { label: "About Teleshop", href: "/about", icon: Info },
  { label: "Help & Contact", href: "/help", icon: MessageCircle },
];

/**
 * Figma "M2 · Mobile — Menu Drawer" (24:2921). Shown below the xl breakpoint. The drawer is
 * portalled to <body>: the navbar's `backdrop-filter` makes it the containing block of any
 * `position: fixed` child, which would squeeze a full-screen drawer into the 62px bar.
 */
export function MobileMenu({
  user,
  categories,
}: {
  user: NavUser | null;
  categories: readonly CategoryDTO[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [catsOpen, setCatsOpen] = useState(() => pathname.startsWith("/c/"));
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const trigger = triggerRef.current;
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="glass"
        size="icon-sm"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
        className="border-line bg-white/5 xl:hidden"
      >
        <Menu aria-hidden />
      </Button>

      {open &&
        createPortal(
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-bg xl:hidden"
          >
            <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-3 pt-3 pb-6">
              <div className="glass-bar flex h-[62px] items-center justify-between rounded-[20px] py-2.5 pr-2.5 pl-4">
                <Logo />
                <Button
                  ref={closeRef}
                  variant="glass"
                  size="icon-sm"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="border-line bg-white/5"
                >
                  <X aria-hidden />
                </Button>
              </div>

              {user && (
                <>
                  <Link
                    href="/account"
                    className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-5"
                  >
                    <span className="relative grid size-14 place-items-center rounded-full bg-linear-to-br from-primary-light to-[#1e40af] font-display text-lg font-bold">
                      {initials(user.name)}
                      <span className="absolute right-0.5 bottom-0.5 size-3 rounded-full border-2 border-surface bg-success" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-display text-lg font-bold">{user.name}</span>
                      <span className="text-[13px] text-primary-light">View profile</span>
                    </span>
                    <ChevronRight aria-hidden className="size-5 text-text-secondary" />
                  </Link>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { label: "Orders", href: "/account/orders", icon: Package },
                      { label: "Track", href: "/track", icon: Truck },
                      { label: "Wishlist", href: "/account/wishlist", icon: Heart },
                    ].map(({ label, href, icon: Icon }) => (
                      <Link
                        key={label}
                        href={href}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface py-4 text-[13px] font-semibold"
                      >
                        <Icon aria-hidden className="size-5 text-primary-light" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </>
              )}

              <nav aria-label="Mobile" className="rounded-[20px] border border-line bg-surface p-2">
                <ul>
                  {topLinks.map((l) => (
                    <DrawerItem key={l.label} link={l} pathname={pathname} />
                  ))}
                  <li>
                    <button
                      type="button"
                      aria-expanded={catsOpen}
                      aria-controls="drawer-categories"
                      onClick={() => setCatsOpen((o) => !o)}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-[15px]",
                        pathname.startsWith("/c/")
                          ? "bg-primary/15 font-semibold"
                          : "text-text hover:bg-white/5",
                      )}
                    >
                      <LayoutGrid aria-hidden className="size-5 text-text-secondary" />
                      <span className="flex-1">Categories</span>
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          "size-4 text-text-muted transition-transform",
                          catsOpen && "rotate-180",
                        )}
                      />
                    </button>
                    <ul
                      id="drawer-categories"
                      hidden={!catsOpen}
                      className="mt-1 mb-1.5 ml-5 border-l border-line pl-2"
                    >
                      {categories.map((c) => {
                        const active = pathname === `/c/${c.slug}`;
                        return (
                          <li key={c.id}>
                            <Link
                              href={`/c/${c.slug}`}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[14px]",
                                active ? "bg-primary/15 font-semibold" : "text-text hover:bg-white/5",
                              )}
                            >
                              <CategoryIcon
                                icon={c.icon}
                                className={cn(
                                  "size-[18px]",
                                  active ? "text-primary-light" : "text-text-secondary",
                                )}
                              />
                              <span className="flex-1">{c.name}</span>
                              <span className="text-xs text-text-muted">{c.productCount}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                  {bottomLinks.map((l) => (
                    <DrawerItem key={l.label} link={l} pathname={pathname} />
                  ))}
                </ul>
              </nav>

              <Link
                href="/register/seller"
                className="flex items-center gap-3.5 rounded-[18px] border border-primary/30 bg-linear-to-r from-[#13203f] to-surface px-5 py-4"
              >
                <Store aria-hidden className="size-5 text-primary-light" />
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold">Sell on Teleshop</span>
                  <span className="text-[13px] text-text-secondary">Register your tech shop</span>
                </span>
                <ArrowRight aria-hidden className="size-5 text-primary-light" />
              </Link>

              {user && (
                <form action={signOutAction}>
                  <Button type="submit" variant="outline" className="w-full bg-white/4">
                    <LogOut aria-hidden className="size-4!" />
                    Sign out
                  </Button>
                </form>
              )}

              {!user && (
                <div className="grid grid-cols-2 gap-2.5">
                  <ButtonLink href="/sign-in" variant="outline" className="bg-white/4">
                    <User aria-hidden className="size-4!" />
                    Sign in
                  </ButtonLink>
                  <ButtonLink href="/register">Join Teleshop</ButtonLink>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function DrawerItem({ link, pathname }: { link: DrawerLink; pathname: string }) {
  const { label, href, icon: Icon, hot } = link;
  const navLabel = link.navLabel ?? label;
  const active = isNavActive({ label: navLabel, href, match: navMatch(navLabel) }, pathname);
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[15px]",
          active ? "bg-primary/15 font-semibold" : "text-text hover:bg-white/5",
        )}
      >
        <Icon aria-hidden className={cn("size-5", active ? "text-primary-light" : "text-text-secondary")} />
        <span className="flex-1">{label}</span>
        {hot ? (
          <Badge tone="accent" size="xs">
            HOT
          </Badge>
        ) : (
          <ChevronRight aria-hidden className="size-4 text-text-muted" />
        )}
      </Link>
    </li>
  );
}
