import type { PackageStatus } from "./types";

/** What an admin can do to a package (docs/01 §5): ship, confirm delivery + COD, return, cancel. */
export const adminSteps = {
  ship: { from: ["ready_to_ship"], to: "shipped" },
  deliver: { from: ["shipped"], to: "delivered" },
  return: { from: ["shipped"], to: "returned" },
  cancel: { from: ["pending", "confirmed", "processing", "ready_to_ship"], to: "cancelled" },
} as const satisfies Record<string, { from: readonly PackageStatus[]; to: PackageStatus }>;
export type AdminStep = keyof typeof adminSteps;

export function canAdminStep(step: AdminStep, status: PackageStatus): boolean {
  return (adminSteps[step].from as readonly PackageStatus[]).includes(status);
}

/** "  px-7731   2093 lk " → "PX-7731 2093 LK": codes are stored the way couriers print them. */
export function normaliseTrackingCode(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

/** The courier's own format (admin-set regex, ≤ 200 chars, checked when saved). */
export function trackingCodeMatches(pattern: string, code: string): boolean {
  if (code.length > 40) return false;
  try {
    // eslint-disable-next-line security/detect-non-literal-regexp -- admin-supplied, validated on save
    return new RegExp(pattern).test(code);
  } catch {
    return false;
  }
}

/** Hand-over time: not before the order was placed, not in the future (10 min clock slack). */
export function validHandOver(at: Date, placedAt: Date, now: Date): boolean {
  return at.getTime() >= placedAt.getTime() && at.getTime() <= now.getTime() + 10 * 60 * 1000;
}

/** Packages that still count for payment after a change (not cancelled, not returned). */
export function livePackageIds(packages: readonly { id: string; status: PackageStatus }[]): string[] {
  return packages.filter((p) => p.status !== "cancelled" && p.status !== "returned").map((p) => p.id);
}
