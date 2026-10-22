import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Heart, Search, ShoppingCart, User } from "lucide-react";
import { mainNav } from "@/config/site";
import { initials } from "@/lib/utils/strings";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { CartCount } from "./CartCount";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import type { NavUser } from "./types";

/**
 * Floating glass navbar — Figma "Navbar component (Guest / Logged in)" 7:214.
 * Server component; only the active-link highlight and the mobile drawer are client code.
 */
export function Navbar({ user, cartCount = 0 }: { user?: NavUser | null; cartCount?: number }) {
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-5 xl:px-10">
      <nav
        aria-label="Main"
        className="glass mx-auto flex h-[62px] max-w-[1360px] items-center justify-between gap-3 rounded-[20px] border-white/8 py-2.5 pr-2.5 pl-4 md:pl-5"
      >
        <Logo />

        <NavLinks
          links={mainNav}
          className="hidden xl:flex"
          trailing={{ Categories: <ChevronDown aria-hidden className="size-3.5" /> }}
          badges={{
            HOT: (
              <Badge tone="accent" size="xs">
                HOT
              </Badge>
            ),
          }}
        />

        <div className="flex items-center gap-2.5">
          <Link
            href="/shop"
            className="hidden h-10 w-[280px] items-center gap-2.5 rounded-xl border border-line bg-white/4 pr-2.5 pl-3.5 text-[13px] text-text-muted transition-colors hover:border-line-strong lg:flex"
          >
            <Search aria-hidden className="size-4" />
            <span className="flex-1">Search phones, laptops…</span>
            <kbd className="rounded-md bg-white/8 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-text-secondary">
              ⌘K
            </kbd>
          </Link>
          <ButtonLink href="/shop" variant="glass" size="icon-sm" aria-label="Search" className="lg:hidden">
            <Search aria-hidden />
          </ButtonLink>
          <ButtonLink
            href="/account/wishlist"
            variant="glass"
            size="icon-sm"
            aria-label="Wishlist"
            className="hidden border-line bg-white/5 md:inline-flex"
          >
            <Heart aria-hidden />
          </ButtonLink>
          <ButtonLink
            href="/cart"
            variant="glass"
            size="icon-sm"
            aria-label="Cart"
            className="relative border-line bg-white/5"
          >
            <ShoppingCart aria-hidden />
            <CartCount serverCount={cartCount} />
          </ButtonLink>

          <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-white/8 md:block" />

          {user ? (
            <Link
              href="/account"
              className="hidden items-center gap-2.5 rounded-xl border border-white/10 py-1 pr-3 pl-1 md:flex"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-[10px] object-cover"
                />
              ) : (
                <span className="grid size-8 place-items-center rounded-[10px] bg-linear-to-br from-primary-light to-[#1e40af] text-xs font-bold">
                  {initials(user.name)}
                </span>
              )}
              <span className="text-[13px] font-semibold">{user.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <div className="hidden items-center gap-2.5 md:flex">
              <ButtonLink href="/sign-in" variant="outline" size="sm">
                <User aria-hidden className="size-3.5!" />
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="sm" className="shadow-none">
                Join Teleshop
              </ButtonLink>
            </div>
          )}

          <MobileMenu user={user ?? null} />
        </div>
      </nav>
    </header>
  );
}
