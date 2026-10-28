import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Landmark } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatLKR } from "@/lib/utils/money";
import { getMyPayouts } from "@/modules/sellers/seller";

export const metadata: Metadata = { title: "Payouts — Seller", robots: { index: false } };

const day = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Colombo",
  });

/** Figma "S4 · Seller — Payouts & Shop Settings" — payouts (P6-T05). */
export default async function PayoutsPage() {
  const p = await getMyPayouts();
  if (!p) notFound();
  const feePct = (p.feeBp / 100).toLocaleString("en-LK", { maximumFractionDigits: 2 });
  const tiles = [
    { label: "Ready to pay out", value: p.unpaidCents, note: "Delivered, not yet paid" },
    { label: "Scheduled", value: p.scheduledCents, note: "Payout on its way" },
    { label: "Paid out", value: p.paidOutCents, note: "All time" },
    { label: "Still to collect", value: p.inProgressCents, note: "Orders not delivered yet" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Payouts</h1>
        <p className="text-sm text-text-secondary">
          Couriers collect Cash on Delivery for each package. Teleshop keeps a {feePct} % fee on the item
          value (not on delivery) and pays you the rest by bank transfer.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label} className="rounded-[18px] border border-line bg-surface p-4">
            <p className="text-[13px] text-text-secondary">{t.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{formatLKR(t.value)}</p>
            <p className="text-xs text-text-muted">{t.note}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { title: "This month", e: p.month },
          { title: "All time", e: p.allTime },
        ].map(({ title, e }) => (
          <section key={title} className="rounded-[20px] border border-line bg-surface p-5 text-sm">
            <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
            <dl className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Delivered packages</dt>
                <dd>{e.deliveredPackages}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Cash collected</dt>
                <dd>{formatLKR(e.grossCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Teleshop fee ({feePct} %)</dt>
                <dd>− {formatLKR(e.feeCents)}</dd>
              </div>
              <div className="mt-1 flex justify-between font-display text-lg font-bold">
                <dt>You earn</dt>
                <dd>{formatLKR(e.netCents)}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>

      <section className="rounded-[20px] border border-line bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Payout history</h2>
          <p className="flex items-center gap-2 text-sm text-text-secondary">
            <Landmark aria-hidden className="size-4" />
            {p.account ? (
              <>
                {p.account.bank}, {p.account.branch} · ••••{p.account.last4}
              </>
            ) : (
              <Link href="/seller/settings" className="font-semibold text-accent hover:text-text">
                Add your bank account to get paid
              </Link>
            )}
          </p>
        </div>
        {p.payouts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-text-secondary">
            No payouts yet. Teleshop pays delivered orders on a regular schedule — each payout shows up here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-text-muted">
                <tr>
                  <th className="py-2 font-medium">Period</th>
                  <th className="py-2 font-medium">Orders</th>
                  <th className="py-2 text-right font-medium">Collected</th>
                  <th className="py-2 text-right font-medium">Fee</th>
                  <th className="py-2 text-right font-medium">Paid to you</th>
                  <th className="py-2 pl-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {p.payouts.map((po) => (
                  <tr key={po.id} className="border-t border-line">
                    <td className="py-2.5">
                      {day(po.periodStart)} – {day(po.periodEnd)}
                    </td>
                    <td className="py-2.5">{po.orderCount}</td>
                    <td className="py-2.5 text-right">{formatLKR(po.grossCents)}</td>
                    <td className="py-2.5 text-right">− {formatLKR(po.feeCents)}</td>
                    <td className="py-2.5 text-right font-semibold">{formatLKR(po.netCents)}</td>
                    <td className="py-2.5 pl-4">
                      <Badge tone={po.status === "paid" ? "success" : "accent"} size="xs">
                        {po.status === "paid" ? `Paid${po.paidAt ? ` ${day(po.paidAt)}` : ""}` : "Scheduled"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
