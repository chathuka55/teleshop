"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LayoutDashboard, MapPin, Package, Store, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Item = { label: string; href: string; icon: LucideIcon };

const items: readonly Item[] = [
  { label: "Overview", href: "/account", icon: LayoutDashboard },
  { label: "My orders", href: "/account/orders", icon: Package },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
];

/** Account navigation (Figma 11 · My Account). A row of pills on mobile, a column on desktop. */
export function AccountSidebar({ seller }: { seller: boolean }) {
  const pathname = usePathname();
  const all = seller ? [...items, { label: "Seller dashboard", href: "/seller", icon: Store }] : items;
  return (
    <nav aria-label="Account" className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-2 lg:flex-col">
        {all.map(({ label, href, icon: Icon }) => {
          const active = href === "/account" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary/15 font-semibold text-text"
                    : "text-text-secondary hover:bg-white/5 hover:text-text",
                )}
              >
                <Icon aria-hidden className={cn("size-[18px]", active && "text-primary-light")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
