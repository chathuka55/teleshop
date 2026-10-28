import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  ClipboardCheck,
  Landmark,
  PackageOpen,
  ScanBarcode,
  Star,
  Truck,
} from "lucide-react";
import { sellerPackageStatus } from "@/components/seller/seller-status";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/guards";
import { cn } from "@/lib/utils/cn";
import { formatLKR } from "@/lib/utils/money";
import { listMyPackages } from "@/modules/fulfilment/seller";
import { countByTab } from "@/modules/fulfilment/tabs";
import { getMyDashboard } from "@/modules/sellers/seller";

export const metadata: Metadata = { title: "Seller dashboard", robots: { index: false } };

/** Figma "S1 · Seller — Dashboard": this month's KPIs, what needs doing now, payouts, latest orders. */
export default async function SellerHomePage() {
  const user = await requireRole("seller");
  const [packages, kpi] = await Promise.all([listMyPackages(), getMyDashboard()]);
  const counts = countByTab(packages);
  const missing = packages.filter((p) => p.status === "processing" && p.missingSerials > 0).length;
  const todo = [
    { label: "New orders to accept", n: counts.new, href: "/seller/orders?tab=new", icon: ClipboardCheck },
    { label: "Orders to pack", n: counts.packing, href: "/seller/orders?tab=packing", icon: PackageOpen },
    { label: "Need IMEI / serial", n: missing, href: "/seller/orders?tab=packing", icon: ScanBarcode },
    { label: "Waiting for courier", n: counts.ready, href: "/seller/orders?tab=ready", icon: Truck },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-text-secondary">Here&apos;s what needs your attention today.</p>
      </header>

      {kpi && (
        <section aria-label={`Sales in ${kpi.monthLabel}`}>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
            {kpi.monthLabel}
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Sales (delivered)", value: formatLKR(kpi.salesCents) },
              {
                label: "Orders",
                value: String(kpi.orders),
                note: kpi.cancelled ? `${kpi.cancelled} cancelled` : undefined,
              },
              { label: "Average order", value: kpi.orders ? formatLKR(kpi.avgOrderCents) : "—" },
              {
                label: "Shop rating",
                value: kpi.rating.count ? kpi.rating.average.toFixed(1) : "—",
                note: `${kpi.rating.count.toLocaleString("en-LK")} reviews`,
                star: true,
              },
            ].map((t) => (
              <div key={t.label} className="rounded-[18px] border border-line bg-surface p-4">
                <dt className="text-[13px] text-text-secondary">{t.label}</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-display text-2xl font-bold">
                  {t.star && <Star aria-hidden className="size-5 fill-accent text-accent" />}
                  {t.value}
                </dd>
                {t.note && <dd className="text-xs text-text-muted">{t.note}</dd>}
              </div>
            ))}
          </dl>
        </section>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="To do">
        {todo.map(({ label, n, href, icon: Icon }) => (
          <li key={label}>
            <Link
              href={href}
              className="flex h-full flex-col gap-3 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-xl",
                  n ? "bg-accent/15 text-accent" : "bg-white/6 text-text-muted",
                )}
              >
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="font-display text-3xl font-bold">{n}</span>
              <span className="text-[13px] text-text-secondary">{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {kpi && (
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/seller/payouts"
            className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-success/12 text-success">
              <Landmark aria-hidden className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-text-secondary">Ready to pay out</span>
              <span className="font-display text-xl font-bold">{formatLKR(kpi.unpaidCents)}</span>
              <span className="block text-xs text-text-muted">
                + {formatLKR(kpi.inProgressCents)} in orders not delivered yet
              </span>
            </span>
            <ChevronRight aria-hidden className="size-4 text-text-muted" />
          </Link>
          <Link
            href="/seller/inventory?low=1"
            className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
          >
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl",
                kpi.lowStock ? "bg-accent/15 text-accent" : "bg-white/6 text-text-muted",
              )}
            >
              <AlertTriangle aria-hidden className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-text-secondary">Low stock</span>
              <span className="font-display text-xl font-bold">
                {kpi.lowStock} SKU{kpi.lowStock === 1 ? "" : "s"}
              </span>
              <span className="block text-xs text-text-muted">Restock before they sell out</span>
            </span>
            <ChevronRight aria-hidden className="size-4 text-text-muted" />
          </Link>
        </div>
      )}

      <section className="rounded-[20px] border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Recent orders</h2>
          <Link
            href="/seller/orders?tab=all"
            className="text-sm font-semibold text-primary-light hover:text-text"
          >
            All orders →
          </Link>
        </div>
        {packages.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            No orders yet. New orders appear here and you&apos;ll get an email for each one.
          </p>
        ) : (
          <ul className="flex flex-col">
            {packages.slice(0, 6).map((p) => {
              const s = sellerPackageStatus[p.status];
              return (
                <li key={p.orderNo} className="border-t border-line first:border-0">
                  <Link
                    href={`/seller/orders/${p.orderNo}`}
                    className="flex items-center gap-3 py-3 text-sm hover:text-primary-light"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {p.orderNo}
                        <Badge tone={s.tone} size="xs">
                          {s.label}
                        </Badge>
                      </span>
                      <span className="line-clamp-1 text-xs text-text-secondary">
                        {p.itemNames.join(", ")} · {p.city}
                      </span>
                    </span>
                    <span className="font-semibold">{formatLKR(p.amountCents)}</span>
                    <ChevronRight aria-hidden className="size-4 text-text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
