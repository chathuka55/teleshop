import type { OrderStatus, PackageStatus } from "./types";

/** A customer may cancel a package until the courier has it (docs/08 §4: "before shipped"). */
export const CUSTOMER_CANCELLABLE: readonly PackageStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready_to_ship",
];

/** Cancelled and returned packages no longer count towards the order's progress. */
const isLive = (s: PackageStatus): boolean => s !== "cancelled" && s !== "returned";

/** Order status derived from its packages (docs/08 orders.status). */
export function deriveOrderStatus(statuses: readonly PackageStatus[]): OrderStatus {
  const live = statuses.filter(isLive);
  if (live.length === 0) return "cancelled";
  if (live.every((s) => s === "delivered")) return "delivered";
  if (live.some((s) => s === "delivered")) return "partially_delivered";
  // One package on its way while another is still being packed counts as "in progress".
  if (live.every((s) => s === "shipped")) return "shipped";
  if (live.every((s) => s === "pending")) return "pending";
  return "in_progress";
}

/** The whole order can be cancelled while no live package has left with the courier. */
export function canCustomerCancel(statuses: readonly PackageStatus[]): boolean {
  const live = statuses.filter((s) => s !== "cancelled");
  return live.length > 0 && live.every((s) => CUSTOMER_CANCELLABLE.includes(s));
}

export const cancelReasons = {
  changed_mind: "I changed my mind",
  ordered_by_mistake: "I ordered by mistake",
  found_cheaper: "I found it cheaper elsewhere",
  delivery_too_slow: "Delivery takes too long",
  other: "Another reason",
} as const;
export type CancelReason = keyof typeof cancelReasons;

/** Tabs on My Orders (Figma 12). */
export const orderTabs = {
  all: { label: "All", statuses: null },
  active: { label: "Active", statuses: ["pending", "in_progress", "shipped", "partially_delivered"] },
  delivered: { label: "Delivered", statuses: ["delivered"] },
  cancelled: { label: "Cancelled", statuses: ["cancelled"] },
} as const satisfies Record<string, { label: string; statuses: readonly OrderStatus[] | null }>;
export type OrderTab = keyof typeof orderTabs;

export function parseOrderTab(raw: string | undefined): OrderTab {
  // Own keys only: `in` would also accept "constructor", "toString"…
  return raw && Object.hasOwn(orderTabs, raw) ? (raw as OrderTab) : "all";
}

/** Tab + free-text search (order number or product name), case-insensitive. */
export function filterOrders<T extends { orderNo: string; status: OrderStatus; itemNames: string[] }>(
  orders: readonly T[],
  tab: OrderTab,
  query: string,
): T[] {
  const statuses: readonly OrderStatus[] | null = orderTabs[tab].statuses;
  const q = query.trim().toLowerCase();
  return orders.filter(
    (o) =>
      (!statuses || statuses.includes(o.status)) &&
      (!q || o.orderNo.toLowerCase().includes(q) || o.itemNames.some((n) => n.toLowerCase().includes(q))),
  );
}
