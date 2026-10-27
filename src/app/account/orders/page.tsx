import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { orderStatusLabel } from "@/components/orders/order-status";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { formatLKR } from "@/lib/utils/money";
import { listMyOrders } from "@/modules/orders/customer";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

const date = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });

/** Figma "12 · My Orders". */
export default async function OrdersPage() {
  const orders = await listMyOrders();
  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">My orders</h1>
      {orders.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-[20px] border border-line bg-surface px-6 py-14 text-center">
          <Package aria-hidden className="size-8 text-primary-light" />
          <p className="mt-3 max-w-sm text-sm text-text-secondary">
            You haven&apos;t placed an order yet. Orders you place with Cash on Delivery appear here with live
            courier tracking.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/shop">Start shopping</ButtonLink>
            <ButtonLink href="/track" variant="glass">
              Track an order
            </ButtonLink>
          </div>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {orders.map((o) => {
            const status = orderStatusLabel[o.status];
            return (
              <li key={o.orderNo}>
                <Link
                  href={`/account/orders/${o.orderNo}`}
                  className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12">
                    <Package aria-hidden className="size-5 text-primary-light" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {o.orderNo}
                      <Badge tone={status.tone} size="xs">
                        {status.label}
                      </Badge>
                    </span>
                    <span className="text-[13px] text-text-secondary">
                      {date(o.placedAt)} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
                      {o.packageCount > 1 && ` · ${o.packageCount} packages`}
                    </span>
                  </span>
                  <span className="font-semibold">{formatLKR(o.totalCents)}</span>
                  <ChevronRight aria-hidden className="size-4 text-text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
