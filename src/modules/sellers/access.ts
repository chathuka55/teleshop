import type { PackageStatus } from "@/modules/orders/types";
import type { EarningsDTO } from "./types";

type Totals = Record<PackageStatus, { packages: number; itemsCents: number; deliveryCents: number }>;

/** Teleshop's fee: basis points of the item value (delivery fees are not charged a fee). */
export function platformFee(itemsCents: number, feeBp: number): number {
  return Math.round((itemsCents * feeBp) / 10_000);
}

/** Delivered packages only: cash the courier collected, minus the fee. */
export function deliveredEarnings(totals: Totals, feeBp: number): EarningsDTO {
  const d = totals.delivered;
  const gross = d.itemsCents + d.deliveryCents;
  const fee = platformFee(d.itemsCents, feeBp);
  return { deliveredPackages: d.packages, grossCents: gross, feeCents: fee, netCents: gross - fee };
}

const IN_PROGRESS: readonly PackageStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready_to_ship",
  "shipped",
];

/** Value of packages not delivered yet (still to be collected). */
export function inProgressValue(totals: Totals): number {
  return IN_PROGRESS.reduce((n, s) => n + totals[s].itemsCents + totals[s].deliveryCents, 0);
}

/** Orders that count as sales: everything except cancelled and returned. */
export function liveOrders(totals: Totals): { count: number; valueCents: number } {
  return (Object.keys(totals) as PackageStatus[])
    .filter((s) => s !== "cancelled" && s !== "returned")
    .reduce(
      (acc, s) => ({
        count: acc.count + totals[s].packages,
        valueCents: acc.valueCents + totals[s].itemsCents + totals[s].deliveryCents,
      }),
      { count: 0, valueCents: 0 },
    );
}

/** Midnight on the 1st of this month in Sri Lanka (UTC+5:30), as a UTC instant. */
export function colomboMonthStart(now: Date): Date {
  const offsetMs = 5.5 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offsetMs);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offsetMs);
}
