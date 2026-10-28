import "server-only";
import { releaseStock } from "@/db/repositories/checkout.repository";
import {
  OrderChangedError,
  findOrderForUpdate,
  findUnconfirmedOrderNos,
  insertOrderEvents,
  updatePackageStatuses,
  type OrderForUpdate,
} from "@/db/repositories/order-status.repository";
import { findSellerContacts } from "@/db/repositories/seller.repository";
import { getSettings } from "@/db/repositories/settings.repository";
import { findUserById } from "@/db/repositories/user.repository";
import { withTransaction } from "@/db/mongoose";
import { audit } from "@/modules/audit/service";
import { sendPackageAutoCancelledEmail, sendSellerPackageAutoCancelledEmail } from "./emails";
import { deriveOrderStatus } from "./status";

export type AutoCancelResult = { orders: number; packages: number; failed: number };

/** Orders handled per run; anything left over is picked up by the next run. */
const BATCH = 200;

type Pkg = OrderForUpdate["packages"][number];

/**
 * Daily job (Vercel Cron → /api/cron/auto-cancel): every package that no shop has accepted within
 * `settings.autoCancelHours` of the order being placed is cancelled and its stock goes back on
 * sale, so customers aren't left waiting on a shop that never answers. One order failing never
 * stops the others; it is counted and retried on the next run.
 */
export async function autoCancelUnconfirmed(now: Date = new Date()): Promise<AutoCancelResult> {
  const { autoCancelHours: hours } = await getSettings();
  const placedBefore = new Date(now.getTime() - hours * 3_600_000);
  const result: AutoCancelResult = { orders: 0, packages: 0, failed: 0 };
  for (const orderNo of await findUnconfirmedOrderNos(placedBefore, BATCH)) {
    try {
      const n = await cancelUnconfirmedPackages(orderNo, hours, now);
      if (n > 0) {
        result.orders += 1;
        result.packages += n;
      }
    } catch {
      // Order number only — never customer details in logs.
      console.error("auto-cancel failed", orderNo);
      result.failed += 1;
    }
  }
  return result;
}

/** One order, one transaction, re-read inside it: a package accepted meanwhile is left alone. */
async function cancelUnconfirmedPackages(orderNo: string, hours: number, now: Date): Promise<number> {
  const reason = `Not accepted by the shop within ${hours} hours`;
  let outcome: { order: OrderForUpdate; cancelled: Pkg[] } | null;
  try {
    outcome = await withTransaction(async (session) => {
      const fresh = await findOrderForUpdate(orderNo, session);
      const targets = fresh?.packages.filter((p) => p.status === "pending") ?? [];
      if (!fresh || !targets.length) return null;

      for (const p of targets) for (const i of p.items) await releaseStock(i.sku, i.qty, session);
      const changes = new Map(targets.map((p) => [p.id, "cancelled" as const]));
      const status = deriveOrderStatus(fresh.packages.map((p) => changes.get(p.id) ?? p.status));
      await updatePackageStatuses(
        fresh,
        changes,
        status === "cancelled" ? { status, cancelledAt: now, cancelReason: reason } : { status },
        session,
      );
      await insertOrderEvents(
        fresh.id,
        targets.map((p) => ({
          packageId: p.id,
          fromStatus: "pending",
          toStatus: "cancelled",
          actorId: null,
          actorRole: "system",
          note: `Cancelled automatically: ${reason.toLowerCase()}`,
        })),
        session,
      );
      return { order: fresh, cancelled: targets };
    });
  } catch (e) {
    // Accepted (or cancelled) by someone else between reading and writing: nothing to do.
    if (e instanceof OrderChangedError) return 0;
    throw e;
  }
  if (!outcome) return 0;
  const { order, cancelled } = outcome;

  await audit.log({
    actorId: null,
    actorRole: "system",
    action: "order.auto_cancelled",
    entity: "order",
    entityId: orderNo,
    data: { packages: cancelled.length, hours },
  });

  // After commit, best effort: a mail outage never undoes the cancellation.
  const [customer, contacts] = await Promise.all([
    findUserById(order.customerId).catch(() => null),
    findSellerContacts(cancelled.map((p) => p.sellerId)).catch(() => []),
  ]);
  await Promise.allSettled(
    contacts.flatMap((c) => {
      const items = cancelled.find((p) => p.sellerId === c.sellerId)?.items ?? [];
      return [
        sendSellerPackageAutoCancelledEmail(c.ownerEmail, c.shopName, orderNo, hours, items),
        ...(customer
          ? [sendPackageAutoCancelledEmail(customer.email, customer.name, orderNo, c.shopName, hours, items)]
          : []),
      ];
    }),
  );
  return cancelled.length;
}
