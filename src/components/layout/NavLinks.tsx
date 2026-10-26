"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isNavActive, type NavLink } from "@/config/site";
import type { CategoryDTO } from "@/modules/catalog/types";
import { cn } from "@/lib/utils/cn";
import { CategoriesMenu } from "./CategoriesMenu";

/** Desktop nav links; client only to highlight the active route and run the Categories dropdown. */
export function NavLinks({
  links,
  categories,
  className,
  badges = {},
}: {
  links: readonly NavLink[];
  categories: readonly CategoryDTO[];
  className?: string;
  badges?: Record<string, ReactNode>;
}) {
  const pathname = usePathname();
  return (
    <ul className={cn("items-center gap-1", className)}>
      {links.map((link) => {
        const active = isNavActive(link, pathname);
        if (link.label === "Categories") {
          return <CategoriesMenu key={link.label} categories={categories} active={active} />;
        }
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
              {link.badge && badges[link.badge]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
