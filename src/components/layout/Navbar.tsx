import Image from "next/image";
import Link from "next/link";
import { Heart, LogOut, ShoppingCart, User } from "lucide-react";
import { mainNav } from "@/config/site";
import { signOutAction } from "@/modules/auth/actions";
import { listNavCategories } from "@/modules/catalog/service";
import type { CategoryDTO } from "@/modules/catalog/types";
import { initials } from "@/lib/utils/strings";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CartCount } from "./CartCount";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NavSearch } from "./NavSearch";
import { NavLinks } from "./NavLinks";
import type { NavUser } from "./types";

/**
 * Floating glass navbar — Figma "Navbar component (Guest / Logged in)" 7:214.
 * Server component; only the active-link highlight, the Categories dropdown, the search box and
 * the mobile drawer are client code.
 */
export async function Navbar({ user, cartCount = 0 }: { user?: NavUser | null; cartCount?: number }) {
  const categories = await loadCategories();
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-5 xl:px-10">
      <nav
        aria-label="Main"
        className="glass-bar mx-auto flex h-[62px] max-w-[1360px] items-center justify-between gap-3 rounded-[20px] border-white/8 py-2.5 pr-2.5 pl-4 md:pl-5"
      >
        <Logo />

        <NavLinks
          links={mainNav}
          categories={categories}
          className="hidden xl:flex"
          badges={{
            HOT: (
              <Badge tone="accent" size="xs">
                HOT
              </Badge>
            ),
          }}
        />

        <div className="flex items-center gap-2.5">
          <NavSearch
            inlineClassName="hidden lg:flex xl:hidden 2xl:flex"
            buttonClassName="lg:hidden xl:inline-flex 2xl:hidden"
          />
          <ButtonLink
            href="/account/wishlist"
            variant="glass"
            size="icon-sm"
            aria-label="Wishlist"
            className="hidden border-line bg-white/5 md:inline-flex"
          >
            <Heart aria-hidden />
          </ButtonLink>
          <ButtonLink href="/cart" variant="glass" size="icon-sm" className="relative border-line bg-white/5">
            <ShoppingCart aria-hidden />
            {/* Name from content ("Cart 2 items"), so it matches what sighted users see (WCAG 2.5.3). */}
            <span className="sr-only">Cart</span>
            <CartCount serverCount={cartCount} />
          </ButtonLink>

          <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-white/8 md:block" />

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/account"
                className="flex items-center gap-2.5 rounded-xl border border-white/10 py-1 pr-3 pl-1"
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
              <form action={signOutAction}>
                <Button
                  type="submit"
                  variant="glass"
                  size="icon-sm"
                  aria-label="Sign out"
                  className="border-line bg-white/5"
                >
                  <LogOut aria-hidden />
                </Button>
              </form>
            </div>
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

          <MobileMenu user={user ?? null} categories={categories} />
        </div>
      </nav>
    </header>
  );
}

/** The navbar is on every page — a database hiccup must not take the whole layout down. */
async function loadCategories(): Promise<CategoryDTO[]> {
  try {
    return await listNavCategories();
  } catch {
    return [];
  }
}
