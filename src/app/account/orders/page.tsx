import type { Metadata } from "next";
import { Package } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

/** Figma "12 · My Orders". Orders arrive with checkout (Phase 4); until then an honest empty state. */
export default function OrdersPage() {
  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">My orders</h1>
      <div className="mt-6 grid place-items-center rounded-[20px] border border-line bg-surface px-6 py-14 text-center">
        <Package aria-hidden className="size-8 text-primary-light" />
        <p className="mt-3 max-w-sm text-sm text-text-secondary">
          No orders yet. Orders you place with Cash on Delivery appear here with live courier tracking.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/shop">Start shopping</ButtonLink>
          <ButtonLink href="/track" variant="glass">
            Track an order
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
