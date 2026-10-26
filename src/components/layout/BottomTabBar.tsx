"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, House, LayoutGrid, ShoppingCart, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const tabs: readonly { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Home", href: "/", icon: House },
  { label: "Categories", href: "/shop", icon: LayoutGrid },
  { label: "Cart", href: "/cart", icon: ShoppingCart },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Account", href: "/account", icon: User },
];

/** Mobile bottom tab bar (Figma M1). Hidden from md up. */
export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Bottom"
      className="glass-bar fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href ||
                (href !== "/account" && pathname.startsWith(href)) ||
                (href === "/shop" && pathname.startsWith("/c/")) ||
                (href === "/account" &&
                  pathname.startsWith("/account") &&
                  !pathname.startsWith("/account/wishlist"));
          return (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-primary-soft" : "text-text-secondary",
                )}
              >
                <span
                  className={cn("grid h-8 w-11 place-items-center rounded-full", active && "bg-primary/18")}
                >
                  <Icon aria-hidden className="size-5" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
