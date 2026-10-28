import "server-only";
import { releaseStock } from "@/db/repositories/checkout.repository";
import {
  OrderChangedError,
  findOrderForUpdate,
  insertOrderEvents,
  updatePackageStatuses,
  type OrderForUpdate,
} from "@/db/repositories/order-status.repository";
import { findSellerContacts } from "@/db/repositories/seller.repository";
import { withTransaction } from "@/db/mongoose";
import type { SessionUser } from "@/lib/auth/claims";
import { audit } from "@/modules/audit/service";
import { sendOrderCancelledEmail, sendSellerPackageCancelledEmail } from "./emails";
import type { CancelOrderInput } from "./schema";
import { canCustomerCancel, cancelReasons, deriveOrderStatus } from "./status";
import type { CancelOrderResult, PackageStatus } from "./types";

const fail = (
  code: Exclude<CancelOrderResult, { ok: true }>["code"],
  message: string,
): CancelOrderResult => ({ ok: false, code, message });

const statusesOf = (o: OrderForUpdate): PackageStatus[] => o.packages.map((p) => p.status);

/**
 * Customer cancels their whole order before any package is shipped (P5-T04). In one
 * transaction: reserved stock goes back on sale, every live package becomes "cancelled", the
 * order status is re-derived and each package gets a timeline entry. The order is re-read inside
 * the transaction and written only if unchanged, so a package the shop just shipped is never
 * cancelled. Shops and the customer are emailed afterwards (best effort).
 */
export async function cancelOrderFor(
  user: SessionUser,
  input: CancelOrderInput,
  ctx: { ip: string | null; now?: Date },
): Promise<CancelOrderResult> {
  const order = await findOrderForUpdate(input.orderNo);
  // Someone else's order looks exactly like a missing one.
  if (!order || order.customerId !== user.id) return fail("NOT_FOUND", "We couldn't find that order.");
  if (!canCustomerCancel(statusesOf(order))) {
    return fail(
      "NOT_CANCELLABLE",
      "This order can't be cancelled any more — a package is already with the courier.",
    );
  }

  const reason = input.note ? `${cancelReasons[input.reason]} — ${input.note}` : cancelReasons[input.reason];
  const now = ctx.now ?? new Date();
  let cancelled: OrderForUpdate["packages"];
  try {
    cancelled = await withTransaction(async (session) => {
      const fresh = await findOrderForUpdate(input.orderNo, session);
      if (!fresh || !canCustomerCancel(statusesOf(fresh))) throw new OrderChangedError(input.orderNo);
      const targets = fresh.packages.filter((p) => p.status !== "cancelled");

      for (const p of targets) for (const i of p.items) await releaseStock(i.sku, i.qty, session);
      const changes = new Map(targets.map((p) => [p.id, "cancelled" as const]));
      await updatePackageStatuses(
        fresh,
        changes,
        {
          status: deriveOrderStatus(fresh.packages.map((p) => changes.get(p.id) ?? p.status)),
          cancelledAt: now,
          cancelReason: reason,
        },
        session,
      );
      await insertOrderEvents(
        fresh.id,
        targets.map((p) => ({
          packageId: p.id,
          fromStatus: p.status,
          toStatus: "cancelled",
          actorId: user.id,
          actorRole: "customer",
          note: `Cancelled by the customer: ${reason}`,
        })),
        session,
      );
      return targets;
    });
  } catch (e) {
    if (e instanceof OrderChangedError) {
      return fail("CHANGED", "This order was just updated by the shop. Reload the page to see its status.");
    }
    throw e;
  }

  await audit.log({
    actorId: user.id,
    actorRole: user.role,
    action: "order.cancelled",
    entity: "order",
    entityId: order.orderNo,
    data: { reason: input.reason, packages: cancelled.length },
    ip: ctx.ip,
  });

  // After commit, best effort: a mail outage never undoes the cancellation.
  const contacts = await findSellerContacts(cancelled.map((p) => p.sellerId)).catch(() => []);
  await Promise.allSettled([
    sendOrderCancelledEmail(user.email, user.name, order.orderNo, reason),
    ...contacts.map((c) =>
      sendSellerPackageCancelledEmail(
        c.ownerEmail,
        c.shopName,
        order.orderNo,
        cancelled.find((p) => p.sellerId === c.sellerId)?.items ?? [],
      ),
    ),
  ]);
  return { ok: true };
}
