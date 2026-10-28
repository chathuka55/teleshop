import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Clock, PackageSearch, Store, Truck } from "lucide-react";
import { formatLKR } from "@/lib/utils/money";
import { adminDashboard, adminTrackingQueue } from "@/modules/admin/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const ago = (iso: string): string => {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  return h < 1 ? "under an hour" : h < 48 ? `${h} h` : `${Math.floor(h / 24)} days`;
};

/** Figma "A2 · Admin — Dashboard": today, the month, and what's waiting for an admin. */
export default async function AdminDashboardPage() {
  const [d, queue] = await Promise.all([adminDashboard(), adminTrackingQueue()]);
  const waiting = [
    { label: "Awaiting tracking code", n: d.packages.ready_to_ship, href: "#tracking-queue", icon: Truck },
    { label: "With couriers", n: d.packages.shipped, href: "/admin/orders?status=shipped", icon: Clock },
    { label: "Shops to approve", n: d.pendingSellers, href: "/admin/sellers", icon: Store },
    { label: "Products to review", n: d.productsInReview, href: "/admin/products", icon: PackageSearch },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Dashboard</h1>

      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Orders today", value: String(d.ordersToday) },
          { label: "Orders this month", value: String(d.ordersMonth) },
          { label: "Delivered this month", value: formatLKR(d.deliveredMonthCents) },
        ].map((t) => (
          <div key={t.label} className="rounded-[18px] border border-line bg-surface p-4">
            <dt className="text-[13px] text-text-secondary">{t.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{t.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Waiting for an admin">
        {waiting.map(({ label, n, href, icon: Icon }) => (
          <li key={label}>
            <Link
              href={href}
              className="flex h-full items-center gap-3 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${n ? "bg-accent/15 text-accent" : "bg-white/6 text-text-muted"}`}
              >
                <Icon aria-hidden className="size-5" />
              </span>
              <span>
                <span className="block font-display text-2xl font-bold">{n}</span>
                <span className="text-[13px] text-text-secondary">{label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section id="tracking-queue" className="scroll-mt-28 rounded-[20px] border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Awaiting tracking code</h2>
        <p className="text-sm text-text-secondary">
          Packed and ready — add the courier&apos;s tracking code once the shop hands each package over.
        </p>
        {queue.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line p-6 text-center text-sm text-text-secondary">
            Nothing waiting. 🎉
          </p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {queue.map((q) => (
              <li key={q.packageId} className="border-t border-line first:border-0">
                <Link
                  href={`/admin/orders/${q.orderNo}#pkg-${q.packageId}`}
                  className="flex items-center gap-3 py-3 text-sm hover:text-primary-light"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{q.orderNo}</span>
                    <span className="block text-xs text-text-secondary">
                      {q.sellerName} → {q.city}, {q.district} · ready for {ago(q.readySince)}
                    </span>
                  </span>
                  <span className="font-semibold">{formatLKR(q.amountCents)}</span>
                  <ChevronRight aria-hidden className="size-4 text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
