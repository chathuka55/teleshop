"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProductSort } from "@/modules/catalog/types";

export const sortOptions: readonly { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
  { value: "discount", label: "Biggest discount" },
];

/** Sort dropdown — updates `?sort=` and resets the cursor. */
export function SortSelect({ value }: { value: ProductSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-[13px] text-text-secondary">
      Sort by:
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("sort", e.target.value);
          next.delete("cursor");
          router.push(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        className="cursor-pointer bg-transparent font-semibold text-text outline-none [&>option]:bg-surface"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
