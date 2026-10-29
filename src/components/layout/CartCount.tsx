"use client";

import { useCart } from "@/hooks/use-cart";

/** Cart badge in the navbar (Figma: blue pill on the cart icon). */
export function CartCount({ serverCount = 0 }: { serverCount?: number }) {
  const { count } = useCart();
  const n = Math.max(count, serverCount);
  if (n < 1) return null;
  return (
    <span className="absolute -top-1.5 left-[26px] rounded-full bg-primary px-[5px] py-px text-[10px] font-bold text-on-primary">
      {n > 99 ? "99+" : n}
      <span className="sr-only"> {n === 1 ? "item" : "items"}</span>
    </span>
  );
}
