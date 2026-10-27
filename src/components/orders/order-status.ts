import type { OrderStatus, PackageStatus } from "@/modules/orders/types";

/** Customer-facing wording + badge tone for order / package statuses. */
export const orderStatusLabel: Record<
  OrderStatus,
  { label: string; tone: "primary" | "success" | "accent" | "danger" }
> = {
  pending: { label: "Waiting for the shop", tone: "accent" },
  in_progress: { label: "Being prepared", tone: "primary" },
  shipped: { label: "On the way", tone: "primary" },
  delivered: { label: "Delivered", tone: "success" },
  partially_delivered: { label: "Partly delivered", tone: "primary" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const packageStatusLabel: Record<PackageStatus, string> = {
  pending: "Waiting for the shop to confirm",
  confirmed: "Confirmed by the shop",
  processing: "Being packed",
  ready_to_ship: "Ready for the courier",
  shipped: "With the courier",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};
