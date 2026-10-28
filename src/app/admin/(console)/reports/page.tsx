import type { Metadata } from "next";
import { formatLKR } from "@/lib/utils/money";
import { adminReport } from "@/modules/admin/session";

export const metadata: Metadata = { title: "Reports — Admin", robots: { index: false } };

/** Figma "A12 · Admin — Reports" (P7-T05): the last 6 months, and this month's best shops and products. */
export default async function AdminReportsPage() {
  const r = await adminReport();
  const feePct = (r.feeBp / 100).toLocaleString("en-LK", { maximumFractionDigits: 2 });
  const total = r.months.reduce(
    (t, m) => ({
      orders: t.orders + m.orders,
      cancelled: t.cancelled + m.cancelled,
      delivered: t.delivered + m.deliveredCents,
      fee: t.fee + m.feeCents,
    }),
    { orders: 0, cancelled: 0, delivered: 0, fee: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Reports</h1>
        <p className="text-sm text-text-secondary">
          By month the order was placed (Sri Lanka time). Delivered = Cash on Delivery collected. Teleshop fee
          at today&apos;s rate ({feePct} % of item value).
        </p>
      </header>

      <section className="overflow-x-auto rounded-[20px] border border-line bg-surface">
        <table className="w-full min-w-[620px] text-sm">
          <caption className="px-5 pt-4 pb-2 text-left font-display text-lg font-bold">Last 6 months</caption>
          <thead className="text-left text-xs text-text-muted">
            <tr>
              <th className="px-5 py-2.5 font-medium">Month</th>
              <th className="px-5 py-2.5 text-right font-medium">Orders</th>
              <th className="px-5 py-2.5 text-right font-medium">Cancelled</th>
              <th className="px-5 py-2.5 text-right font-medium">Delivered</th>
              <th className="px-5 py-2.5 text-right font-medium">Teleshop fee</th>
            </tr>
          </thead>
          <tbody>
            {r.months.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-text-secondary">
                  No orders yet.
                </td>
              </tr>
            )}
            {r.months.map((m) => (
              <tr key={m.month} className="border-t border-line">
                <td className="px-5 py-2.5">{m.label}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{m.orders}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{m.cancelled}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{formatLKR(m.deliveredCents)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{formatLKR(m.feeCents)}</td>
              </tr>
            ))}
          </tbody>
          {r.months.length > 1 && (
            <tfoot>
              <tr className="border-t border-line-strong font-semibold">
                <td className="px-5 py-2.5">Total</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{total.orders}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{total.cancelled}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{formatLKR(total.delivered)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{formatLKR(total.fee)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: "Top shops this month", rows: r.top.shops },
          { title: "Top products this month", rows: r.top.products },
        ].map((t) => (
          <section key={t.title} className="rounded-[20px] border border-line bg-surface p-5">
            <h2 className="mb-2 font-display text-lg font-bold">{t.title}</h2>
            {t.rows.length === 0 ? (
              <p className="text-sm text-text-secondary">Nothing delivered this month yet.</p>
            ) : (
              <ol className="flex flex-col">
                {t.rows.map((x, i) => (
                  <li
                    key={x.id}
                    className="flex items-center gap-3 border-t border-line py-2.5 text-sm first:border-0"
                  >
                    <span className="w-5 text-text-muted tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{x.name}</span>
                    <span className="text-xs text-text-secondary tabular-nums">{x.units} sold</span>
                    <span className="font-semibold tabular-nums">{formatLKR(x.cents)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
