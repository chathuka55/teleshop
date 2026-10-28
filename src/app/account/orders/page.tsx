import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Package, Search } from "lucide-react";
import { orderStatusLabel } from "@/components/orders/order-status";
import { ProductArt } from "@/components/product/ProductArt";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { formatLKR } from "@/lib/utils/money";
import { listMyOrders } from "@/modules/orders/customer";
import { orderTabs, parseOrderTab, type OrderTab } from "@/modules/orders/status";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

type Props = { searchParams: Promise<{ tab?: string; q?: string }> };

const date = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });

const tabHref = (tab: OrderTab, q: string): string => {
  const params = new URLSearchParams();
  if (tab !== "all") params.set("tab", tab);
  if (q) params.set("q", q);
  const s = params.toString();
  return s ? `/account/orders?${s}` : "/account/orders";
};

const itemsLine = (names: readonly string[]): string =>
  names.length > 1 ? `${names[0]} + ${names.length - 1} more` : (names[0] ?? "");

/** Figma "12 · My Orders" — tabs and search (P5-T01). */
export default async function OrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = parseOrderTab(sp.tab);
  const q = (sp.q ?? "").trim().slice(0, 60);
  const { orders, total } = await listMyOrders({ tab, q });

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">My orders</h1>
      {total === 0 ? (
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
        <>
          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <nav
              aria-label="Filter orders"
              className="flex gap-1 overflow-x-auto rounded-[14px] bg-white/4 p-1"
            >
              {(Object.keys(orderTabs) as OrderTab[]).map((t) => (
                <Link
                  key={t}
                  href={tabHref(t, q)}
                  aria-current={t === tab ? "page" : undefined}
                  className={cn(
                    "rounded-[10px] px-4 py-2 text-[13px] font-semibold whitespace-nowrap",
                    t === tab ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text",
                  )}
                >
                  {orderTabs[t].label}
                </Link>
              ))}
            </nav>
            <form action="/account/orders" role="search" className="md:w-72">
              {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
              <label className="flex h-11 items-center gap-2.5 rounded-[14px] border border-line bg-white/4 px-4 focus-within:border-primary-light/60">
                <Search aria-hidden className="size-4 text-text-muted" />
                <span className="sr-only">Search orders</span>
                <input
                  name="q"
                  type="search"
                  defaultValue={q}
                  maxLength={60}
                  placeholder="Order number or product"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
                />
              </label>
            </form>
          </div>

          {orders.length === 0 ? (
            <p className="mt-6 rounded-[20px] border border-dashed border-line px-6 py-10 text-center text-sm text-text-secondary">
              No orders match{q ? ` “${q}”` : ""} in this tab.{" "}
              <Link href="/account/orders" className="font-semibold text-primary-light hover:text-text">
                Show all orders
              </Link>
            </p>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {orders.map((o) => {
                const status = orderStatusLabel[o.status];
                return (
                  <li key={o.orderNo}>
                    <Link
                      href={`/account/orders/${o.orderNo}`}
                      className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                    >
                      <ProductArt
                        product={{
                          art: { kind: "phone", tint: "blue" },
                          imageUrl: o.imageUrl,
                          name: o.itemNames[0] ?? o.orderNo,
                        }}
                        size="sm"
                        artScale={0.4}
                        className="size-14 shrink-0 rounded-xl"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 font-semibold">
                          {o.orderNo}
                          <Badge tone={status.tone} size="xs">
                            {status.label}
                          </Badge>
                        </span>
                        <span className="line-clamp-1 text-[13px]">{itemsLine(o.itemNames)}</span>
                        <span className="text-xs text-text-secondary">
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
        </>
      )}
    </div>
  );
}
