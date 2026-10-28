import type { PackageStatus } from "@/modules/orders/types";

/** What a shop can do to its own package (docs/01 §5 order lifecycle). */
export const sellerSteps = {
  accept: { from: ["pending"], to: "confirmed" },
  pack: { from: ["confirmed"], to: "processing" },
  ready: { from: ["processing"], to: "ready_to_ship" },
  // After "ready to ship" the package is with the courier hand-over; only an admin can stop it.
  cancel: { from: ["pending", "confirmed", "processing"], to: "cancelled" },
} as const satisfies Record<string, { from: readonly PackageStatus[]; to: PackageStatus }>;
export type SellerStep = keyof typeof sellerSteps;

export function canSellerStep(step: SellerStep, status: PackageStatus): boolean {
  return (sellerSteps[step].from as readonly PackageStatus[]).includes(status);
}

/** Serials can be entered or corrected once accepted, until the package is ready to ship. */
export function canRecordSerials(status: PackageStatus): boolean {
  return status === "confirmed" || status === "processing";
}

/** Items in serial-tracked categories (phones, laptops) need one IMEI/serial per unit. */
export function missingSerials(
  items: readonly { qty: number; requiresSerial: boolean; serialNumbers: readonly string[] }[],
): number {
  return items.reduce((n, i) => n + (i.requiresSerial ? Math.max(0, i.qty - i.serialNumbers.length) : 0), 0);
}

/** The customer's full address and phone are shown to the shop only after it accepts. */
export function canSeeFullAddress(status: PackageStatus): boolean {
  return status !== "pending" && status !== "cancelled";
}
