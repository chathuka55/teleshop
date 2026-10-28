import type { PackageStatus } from "@/modules/orders/types";

/** Tabs on /seller/orders (Figma S2), in work order. */
export const sellerOrderTabs = {
  new: { label: "New", statuses: ["pending"] },
  packing: { label: "To pack", statuses: ["confirmed", "processing"] },
  ready: { label: "Ready to ship", statuses: ["ready_to_ship"] },
  shipped: { label: "Shipped", statuses: ["shipped"] },
  delivered: { label: "Delivered", statuses: ["delivered"] },
  cancelled: { label: "Cancelled", statuses: ["cancelled", "returned"] },
  all: { label: "All", statuses: null },
} as const satisfies Record<string, { label: string; statuses: readonly PackageStatus[] | null }>;
export type SellerOrderTab = keyof typeof sellerOrderTabs;

export function parseSellerOrderTab(raw: string | undefined): SellerOrderTab {
  return raw && Object.hasOwn(sellerOrderTabs, raw) ? (raw as SellerOrderTab) : "new";
}

export function inSellerTab(tab: SellerOrderTab, status: PackageStatus): boolean {
  const statuses: readonly PackageStatus[] | null = sellerOrderTabs[tab].statuses;
  return !statuses || statuses.includes(status);
}

/** Packages per tab, for the counters on the tabs and the dashboard to-do list. */
export function countByTab(packages: readonly { status: PackageStatus }[]): Record<SellerOrderTab, number> {
  const out = Object.fromEntries(Object.keys(sellerOrderTabs).map((t) => [t, 0])) as Record<
    SellerOrderTab,
    number
  >;
  for (const p of packages) {
    for (const t of Object.keys(sellerOrderTabs) as SellerOrderTab[]) if (inSellerTab(t, p.status)) out[t]++;
  }
  return out;
}
