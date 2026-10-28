import "server-only";
import { findCustomerOrder, listCustomerOrders } from "@/db/repositories/order.repository";
import { requireUser } from "@/lib/auth/guards";
import { canReviewPackage } from "@/modules/reviews/access";
import { cancelOrderFor } from "./cancel";
import { placeOrderFor } from "./checkout";
import type { CancelOrderInput, PlaceOrderInput } from "./schema";
import { canCustomerCancel, filterOrders, type OrderTab } from "./status";
import type { CancelOrderResult, CustomerOrderDTO, CustomerOrderSummaryDTO, PlaceOrderResult } from "./types";

/**
 * Signed-in customer's orders (Phase 4–5). Kept apart from service.ts so the public tracking
 * lookup has no dependency on the session.
 */

/** Places the signed-in customer's order (see placeOrderFor for the rules). */
export async function placeOrder(input: PlaceOrderInput, ip: string | null): Promise<PlaceOrderResult> {
  return placeOrderFor(await requireUser(), input, { ip });
}

export async function cancelMyOrder(input: CancelOrderInput, ip: string | null): Promise<CancelOrderResult> {
  return cancelOrderFor(await requireUser(), input, { ip });
}

/** The order with the rules applied: may it still be cancelled, which items can be reviewed. */
export async function getMyOrder(orderNo: string): Promise<CustomerOrderDTO | null> {
  const user = await requireUser();
  const order = await findCustomerOrder(user.id, orderNo);
  if (!order) return null;
  return {
    ...order,
    canCancel: canCustomerCancel(order.packages.map((p) => p.status)),
    packages: order.packages.map((p) => ({
      ...p,
      items: p.items.map((i) => ({
        ...i,
        canReview: canReviewPackage(p.status) && i.myRating === null && !!i.productSlug,
      })),
    })),
  };
}

/** Orders in the chosen tab / matching the search, plus how many the customer has in total. */
export async function listMyOrders(
  filter: { tab?: OrderTab; q?: string } = {},
): Promise<{ orders: CustomerOrderSummaryDTO[]; total: number }> {
  const all = await listCustomerOrders((await requireUser()).id);
  return { orders: filterOrders(all, filter.tab ?? "all", filter.q ?? ""), total: all.length };
}
