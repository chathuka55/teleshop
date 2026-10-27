import "server-only";
import { findCustomerOrder, listCustomerOrders } from "@/db/repositories/order.repository";
import { requireUser } from "@/lib/auth/guards";
import { placeOrderFor } from "./checkout";
import type { PlaceOrderInput } from "./schema";
import type { CustomerOrderDTO, CustomerOrderSummaryDTO, PlaceOrderResult } from "./types";

/**
 * Signed-in customer's orders (Phase 4). Kept apart from service.ts so the public tracking
 * lookup has no dependency on the session.
 */

/** Places the signed-in customer's order (see placeOrderFor for the rules). */
export async function placeOrder(input: PlaceOrderInput, ip: string | null): Promise<PlaceOrderResult> {
  return placeOrderFor(await requireUser(), input, { ip });
}

export async function getMyOrder(orderNo: string): Promise<CustomerOrderDTO | null> {
  const user = await requireUser();
  return findCustomerOrder(user.id, orderNo);
}

export async function listMyOrders(): Promise<CustomerOrderSummaryDTO[]> {
  return listCustomerOrders((await requireUser()).id);
}
