import type { Metadata } from "next";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { CreatePayoutButton } from "@/components/admin/CreatePayoutButton";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { DoneBanner } from "@/components/admin/DoneBanner";
import { Badge } from "@/components/ui/Badge";
import { formatLKR } from "@/lib/utils/money";
import { adminPayoutCandidates, adminPayouts } from "@/modules/admin/session";

export const metadata: Metadata = { title: "Payouts — Admin", robots: { index: false } };

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Colombo",
  });

const Bank = ({ bank }: { bank: { bank: string; branch: string; last4: string } | null }) =>
  bank ? (
    <span className="inline-flex items-center gap-1.5">
      <Landmark aria-hidden className="size-3.5" /> {bank.bank}, {bank.branch} · ••••{bank.last4}
    </span>
  ) : (
    <span className="text-accent">No bank account on file</span>
  );

/**
 * Payouts: 1) shops with collected COD not yet paid out → "Create payout" (everything up to now);
 * 2) scheduled payouts → transfer the money, then "Mark paid" with the bank reference.
 */
const done = {
  scheduled: "Payout scheduled. Transfer the money, then mark it paid with the bank reference.",
  paid: "Marked paid. The shop was emailed the reference.",
} as const;

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const flag = (await searchParams).done;
  const [candidates, scheduled, paid] = await Promise.all([
    adminPayoutCandidates(),
    adminPayouts("scheduled"),
    adminPayouts("paid"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Payouts</h1>
        <p className="text-sm text-text-secondary">
          Couriers collect Cash on Delivery per package. Pay each shop what was collected, minus the Teleshop
          fee on item value.
        </p>
      </header>

      <DoneBanner message={flag === "scheduled" || flag === "paid" ? done[flag] : undefined} />

      <section className="rounded-[20px] border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Ready to pay out</h2>
        {candidates.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-line p-6 text-center text-sm text-text-secondary">
            Nothing collected since the last payouts.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {candidates.map((c) => (
              <li
                key={c.sellerId}
                className="flex flex-col gap-3 border-t border-line py-4 first:border-0 md:flex-row md:items-center"
              >
                <div className="min-w-0 flex-1 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <Link href={`/admin/sellers/${c.sellerId}`} className="hover:text-primary-light">
                      {c.shopName}
                    </Link>
                    {c.shopStatus === "suspended" && (
                      <Badge tone="danger" size="xs">
                        suspended
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Since {day(c.periodStart)} · {c.packageCount} package{c.packageCount === 1 ? "" : "s"} ·{" "}
                    {formatLKR(c.grossCents)} collected − {formatLKR(c.feeCents)} fee
                  </p>
                  <p className="text-xs text-text-muted">
                    <Bank bank={c.bank} />
                  </p>
                </div>
                <p className="font-display text-xl font-bold md:mr-4">{formatLKR(c.netCents)}</p>
                <CreatePayoutButton sellerId={c.sellerId} disabled={!c.bank} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[20px] border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Scheduled — transfer, then mark paid</h2>
        {scheduled.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">No payouts waiting.</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {scheduled.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 border-t border-line py-4 first:border-0 md:flex-row md:items-start"
              >
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">
                    {p.shopName} · {formatLKR(p.netCents)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {day(p.periodStart)} – {day(p.periodEnd)} · {p.orderCount} order
                    {p.orderCount === 1 ? "" : "s"} · {formatLKR(p.grossCents)} − {formatLKR(p.feeCents)} fee
                  </p>
                  <p className="text-xs text-text-muted">
                    <Bank bank={p.bank} />
                  </p>
                </div>
                <div className="md:w-80">
                  <DecisionForm kind="payout" id={p.id} allowed={["paid"]} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[20px] border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Paid</h2>
        {paid.length === 0 ? (
          <p className="text-sm text-text-secondary">No payouts made yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-left text-xs text-text-muted">
                <tr>
                  <th className="py-2 font-medium">Shop</th>
                  <th className="py-2 font-medium">Period</th>
                  <th className="py-2 text-right font-medium">Paid</th>
                  <th className="py-2 pl-4 font-medium">Reference</th>
                  <th className="py-2 pl-4 font-medium">On</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-2.5">{p.shopName}</td>
                    <td className="py-2.5">
                      {day(p.periodStart)} – {day(p.periodEnd)}
                    </td>
                    <td className="py-2.5 text-right font-semibold">{formatLKR(p.netCents)}</td>
                    <td className="py-2.5 pl-4 font-mono text-xs">{p.reference}</td>
                    <td className="py-2.5 pl-4">{p.paidAt ? day(p.paidAt) : "—"}</td>
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
