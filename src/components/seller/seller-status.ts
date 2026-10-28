import type { BadgeTone } from "@/components/ui/Badge";
import type { PackageStatus } from "@/modules/orders/types";

/** Seller-facing wording: what the package needs from the shop next. */
export const sellerPackageStatus: Record<PackageStatus, { label: string; tone: BadgeTone; next: string }> = {
  pending: {
    label: "New",
    tone: "accent",
    next: "Accept the order or tell the customer you can't fulfil it.",
  },
  confirmed: { label: "Accepted", tone: "primary", next: "Start packing when the items are ready." },
  processing: {
    label: "Packing",
    tone: "primary",
    next: "Record IMEI/serial numbers, then mark it ready to ship.",
  },
  ready_to_ship: {
    label: "Ready to ship",
    tone: "primary",
    next: "Hand the package to the courier. Teleshop adds the tracking code after hand-over.",
  },
  shipped: { label: "With the courier", tone: "primary", next: "The courier collects the cash on delivery." },
  delivered: { label: "Delivered", tone: "success", next: "Done — the payment shows in your payouts." },
  cancelled: { label: "Cancelled", tone: "danger", next: "Nothing more to do. Stock was put back on sale." },
  returned: { label: "Returned", tone: "danger", next: "The courier is returning this package to you." },
};
