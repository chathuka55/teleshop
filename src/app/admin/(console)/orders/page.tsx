import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { orderStatusLabel } from "@/components/orders/order-status";
import { sellerPackageStatus } from "@/components/seller/seller-status";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { formatLKR } from "@/lib/utils/money";
import { adminOrders } from "@/modules/admin/session";
import { adminOrderListSchema } from "@/modules/orders/admin-schema";
import type { OrderStatus } from "@/modules/orders/types";

export const metadata: Metadata = { title: "Orders — Admin", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

const tabs: { key: OrderStatus | undefined; label: string }[] = [
  { key: undefined, label: "All" },
  { key: "pending", label: "New" },
  { key: "in_progress", label: "In progress" },
  { key: "shipped", label: "Shipped" },
  { key: "partially_delivered", label: "Part delivered" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const href = (p: { status?: string; q?: string; page?: number }): string => {
  const s = new URLSearchParams();
  if (p.status) s.set("status", p.status);
  if (p.q) s.set("q", p.q);
  if (p.page && p.page > 1) s.set("page", String(p.page));
  const qs = s.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
};

/** Figma "A3 · Admin — Orders" (P7-T02). Search: order number, phone or customer email. */
export default async function AdminOrdersPage({ searchParams }: Props) {
  const parsed = adminOrderListSchema.safeParse(await searchParams);
  const f = parsed.success ? parsed.data : { q: "", page: 1, status: undefined };
  const { rows, total, pageSize } = await adminOrders(f);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-LK", {
      timeZone: "Asia/Colombo",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Orders</h1>
      <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <nav
          aria-label="Filter orders"
          className="no-scrollbar flex gap-1 overflow-x-auto rounded-[14px] bg-white/4 p-1"
        >
          {tabs.map((t) => (
            <Link
              key={t.label}
              href={href({ status: t.key, q: f.q })}
              aria-current={t.key === f.status ? "page" : undefined}
              className={cn(
                "rounded-[10px] px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap",
                t.key === f.status ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form action="/admin/orders" role="search" className="xl:w-80">
          {f.status && <input type="hidden" name="status" value={f.status} />}
          <label className="flex h-11 items-center gap-2.5 rounded-[14px] border border-line bg-white/4 px-4 focus-within:border-primary-light/60">
            <Search aria-hidden className="size-4 text-text-muted" />
            <span className="sr-only">Search orders</span>
            <input
              name="q"
              type="search"
              defaultValue={f.q}
              maxLength={80}
              placeholder="Order no., phone or email"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
            />
          </label>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-[20px] border border-dashed border-line px-6 py-10 text-center text-sm text-text-secondary">
          {f.q
            ? `No order matches “${f.q}”. Search by full order number, phone (07X…) or customer email.`
            : "No orders here."}
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2.5">
          {rows.map((o) => {
            const s = orderStatusLabel[o.status];
            return (
              <li key={o.orderNo}>
                <Link
                  href={`/admin/orders/${o.orderNo}`}
                  className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {o.orderNo}
                      <Badge tone={s.tone} size="xs">
                        {s.label}
                      </Badge>
                    </span>
                    <span className="block text-[13px]">
                      {o.recipientName} · {o.city}, {o.district}
                    </span>
                    <span className="flex flex-wrap gap-x-3 text-xs text-text-secondary">
                      {when(o.placedAt)}
                      {o.packages.map((p, i) => (
                        <span key={i}>
                          {p.sellerName}: {sellerPackageStatus[p.status].label}
                        </span>
                      ))}
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

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-5 flex items-center justify-center gap-3 text-sm">
          {f.page > 1 && (
            <Link
              href={href({ ...f, page: f.page - 1 })}
              className="inline-flex items-center gap-1 hover:text-primary-light"
            >
              <ChevronLeft aria-hidden className="size-4" /> Newer
            </Link>
          )}
          <span className="text-text-secondary">
            Page {f.page} of {pages} · {total} orders
          </span>
          {f.page < pages && (
            <Link
              href={href({ ...f, page: f.page + 1 })}
              className="inline-flex items-center gap-1 hover:text-primary-light"
            >
              Older <ChevronRight aria-hidden className="size-4" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
