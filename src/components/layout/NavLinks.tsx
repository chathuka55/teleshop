"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { NavLink } from "@/config/site";
import { cn } from "@/lib/utils/cn";

/** Desktop nav links; client only to highlight the active route. */
export function NavLinks({
  links,
  className,
  trailing = {},
  badges = {},
}: {
  links: readonly NavLink[];
  className?: string;
  trailing?: Record<string, ReactNode>;
  badges?: Record<string, ReactNode>;
}) {
  const pathname = usePathname();
  return (
    <ul className={cn("items-center gap-1", className)}>
      {links.map((link) => {
        const path = link.href.split(/[?#]/)[0] ?? "/";
        const active =
          path === "/" ? pathname === "/" : pathname.startsWith(path) && link.label !== "Categories";
        return (
          <li key={link.label}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-sm transition-colors",
                active
                  ? "bg-white/8 font-semibold text-text"
                  : "font-medium text-text-secondary hover:bg-white/5 hover:text-text",
              )}
            >
              {link.label}
              {trailing[link.label]}
              {link.badge && badges[link.badge]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
