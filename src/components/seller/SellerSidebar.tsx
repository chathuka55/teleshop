"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Item = { label: string; href: string; icon: LucideIcon; badge?: number };

/** Seller portal navigation (Figma S1–S4). Pills on mobile, a column on desktop. */
export function SellerSidebar({ shopName, newOrders }: { shopName: string; newOrders: number }) {
  const pathname = usePathname();
  const items: Item[] = [
    { label: "Dashboard", href: "/seller", icon: LayoutDashboard },
    { label: "Orders", href: "/seller/orders", icon: ClipboardList, badge: newOrders },
    { label: "My account", href: "/account", icon: UserRound },
  ];
  return (
    <nav aria-label="Seller" className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <p className="mb-3 hidden truncate px-3.5 text-xs font-semibold tracking-wide text-text-muted uppercase lg:block">
        {shopName}
      </p>
      <ul className="flex gap-2 lg:flex-col">
        {items.map(({ label, href, icon: Icon, badge }) => {
          const active = href === "/seller" ? pathname === href : pathname.startsWith(href);
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
                {!!badge && (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-[#0b1220]">
                    {badge}
                    <span className="sr-only"> new</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
