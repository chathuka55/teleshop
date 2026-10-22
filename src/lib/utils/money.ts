/**
 * Money is stored as integer cents (LKR). `38990000` cents = LKR 389,900.00.
 * Never use floats for money; format only in the UI.
 */

const lkrFormatter = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 });
const lkrFormatterCents = new Intl.NumberFormat("en-LK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function assertCents(cents: number): void {
  if (!Number.isSafeInteger(cents))
    throw new TypeError(`Money must be an integer number of cents, got ${cents}`);
}

/** `formatLKR(38990000)` → `"LKR 389,900"`. Pass `{ cents: true }` to always show two decimals. */
export function formatLKR(cents: number, opts: { cents?: boolean; prefix?: boolean } = {}): string {
  assertCents(cents);
  const { cents: showCents = false, prefix = true } = opts;
  const whole = cents / 100;
  const body = showCents || cents % 100 !== 0 ? lkrFormatterCents.format(whole) : lkrFormatter.format(whole);
  return prefix ? `LKR ${body}` : body;
}

/** Rupees (integer or 2-dp string from a form) → cents. Rejects more than 2 decimals. */
export function lkrToCents(lkr: number | string): number {
  const s = typeof lkr === "number" ? lkr.toString() : lkr.trim().replace(/,/g, "");
  if (!/^\d+$/.test(s) && !/^\d+\.\d{1,2}$/.test(s)) throw new TypeError(`Invalid LKR amount: ${lkr}`);
  const [whole = "0", frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Whole-percent discount between a compare-at price and the selling price (0 when none). */
export function discountPercent(priceCents: number, compareAtCents?: number | null): number {
  assertCents(priceCents);
  if (!compareAtCents || compareAtCents <= priceCents) return 0;
  assertCents(compareAtCents);
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}

/** Sum line totals in cents; every input must be an integer. */
export function sumCents(values: readonly number[]): number {
  return values.reduce((acc, v) => {
    assertCents(v);
    return acc + v;
  }, 0);
}
