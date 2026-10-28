import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Newer / older links for admin lists (25–50 rows a page). `href(page)` keeps the filters. */
export function Pager({
  page,
  total,
  pageSize,
  noun,
  href,
}: {
  page: number;
  total: number;
  pageSize: number;
  noun: string;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-5 flex items-center justify-center gap-3 text-sm">
      {page > 1 && (
        <Link href={href(page - 1)} className="inline-flex items-center gap-1 hover:text-primary-light">
          <ChevronLeft aria-hidden className="size-4" /> Newer
        </Link>
      )}
      <span className="text-text-secondary">
        Page {page} of {pages} · {total.toLocaleString("en-LK")} {noun}
      </span>
      {page < pages && (
        <Link href={href(page + 1)} className="inline-flex items-center gap-1 hover:text-primary-light">
          Older <ChevronRight aria-hidden className="size-4" />
        </Link>
      )}
    </nav>
  );
}

/** "?a=1&page=2" from the set values only. */
export function queryHref(base: string, params: Record<string, string | number | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && !(k === "page" && v === 1)) s.set(k, String(v));
  }
  const q = s.toString();
  return q ? `${base}?${q}` : base;
}
