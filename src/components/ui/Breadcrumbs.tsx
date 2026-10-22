import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-text-secondary md:text-[13px]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="hover:text-text">
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={last ? "font-semibold text-text" : undefined}
                >
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight aria-hidden className="size-3.5 text-text-muted" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
