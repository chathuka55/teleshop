"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, PackageSearch, Store, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Item = { label: string; href: string; icon: LucideIcon; badge?: number };

/** Admin console navigation (Figma A1–A14). Pills on mobile, a column on desktop. */
export function AdminSidebar({
  pendingShops,
  productsInReview,
}: {
  pendingShops: number;
  productsInReview: number;
}) {
  const pathname = usePathname();
  const items: Item[] = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Orders", href: "/admin/orders", icon: ClipboardList },
    { label: "Shops", href: "/admin/sellers", icon: Store, badge: pendingShops },
    { label: "Products", href: "/admin/products", icon: PackageSearch, badge: productsInReview },
  ];
  return (
    <nav aria-label="Admin" className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <p className="mb-3 hidden px-3.5 text-xs font-semibold tracking-wide text-text-muted uppercase lg:block">
        Teleshop admin
      </p>
      <ul className="flex gap-2 lg:flex-col">
        {items.map(({ label, href, icon: Icon, badge }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
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
                    <span className="sr-only"> waiting</span>
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
