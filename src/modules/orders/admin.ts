import "server-only";
import type { ClientSession } from "mongoose";
import { findAdminOrder, listAdminOrders, listTrackingQueue } from "@/db/repositories/admin-order.repository";
import { commitSoldStock, releaseStock } from "@/db/repositories/checkout.repository";
import { findActiveCourier, listActiveCouriers } from "@/db/repositories/courier.repository";
import {
  OrderChangedError,
  findOrderForUpdate,
  findTrackingCodeUse,
  insertOrderEvents,
  updatePackageStatuses,
  type OrderForUpdate,
} from "@/db/repositories/order-status.repository";
import { setPackagePayment } from "@/db/repositories/payment.repository";
import { findSellerContacts } from "@/db/repositories/seller.repository";
import { findUserById } from "@/db/repositories/user.repository";
import { withTransaction } from "@/db/mongoose";
import { buildTrackingUrl } from "@/config/couriers";
import { assertRole } from "@/lib/auth/authorize";
import type { SessionUser } from "@/lib/auth/claims";
import { orderNo as orderNoSchema, phoneLK } from "@/lib/validation/common";
import { audit } from "@/modules/audit/service";
import {
  adminSteps,
  canAdminStep,
  livePackageIds,
  normaliseTrackingCode,
  trackingCodeMatches,
  validHandOver,
  type AdminStep,
} from "./admin-access";
import {
  sendCancelledByTeleshopEmail,
  sendDeliveredEmail,
  sendReturnedEmail,
  sendShippedEmail,
  sendShopPackageCancelledByTeleshopEmail,
} from "./admin-emails";
import type { AddTrackingCodeInput, AdminPackageStepInput } from "./admin-schema";
import type {
  AdminActionResult,
  AdminOrderDTO,
  AdminOrderRowDTO,
  CourierDTO,
  TrackingQueueItemDTO,
} from "./admin-types";
import { deriveOrderStatus } from "./status";
import type { OrderStatus } from "./types";

/**
 * Admin order operations (P7-T02, docs/09 §5). Every function starts with assertRole("admin")
 * — admins who passed TOTP only — and every write is audit-logged.
 */

const fail = (message: string, fields?: Record<string, string>): AdminActionResult => ({
  ok: false,
  message,
  ...(fields ? { fields } : {}),
});
const CHANGED = fail("This order changed meanwhile. Reload the page to see its status.");

type Pkg = OrderForUpdate["packages"][number];

/**
 * One package status change in a transaction: re-reads the order, checks the package is still in
 * an allowed status, runs `inTx` (stock, payment), sets the status (+ fields), adds the event.
 */
async function transition(
  admin: SessionUser,
  orderNo: string,
  packageId: string,
  step: AdminStep,
  opts: {
    note: string;
    now: Date;
    packageFields?: Record<string, unknown>;
    cancelReason?: string;
    inTx?: (pkg: Pkg, order: OrderForUpdate, session: ClientSession) => Promise<void>;
  },
): Promise<
  | { ok: true; order: OrderForUpdate; pkg: Pkg; status: OrderStatus }
  | { ok: false; result: AdminActionResult }
> {
  const to = adminSteps[step].to;
  try {
    return await withTransaction(async (session) => {
      const order = await findOrderForUpdate(orderNo, session);
      const pkg = order?.packages.find((p) => p.id === packageId);
      if (!order || !pkg) return { ok: false as const, result: fail("We couldn't find that package.") };
      if (!canAdminStep(step, pkg.status)) {
        return {
          ok: false as const,
          result: fail(`This package is "${pkg.status.replace(/_/g, " ")}" — that step isn't available.`),
        };
      }
      await opts.inTx?.(pkg, order, session);
      const changes = new Map([[pkg.id, to]]);
      const status = deriveOrderStatus(order.packages.map((p) => changes.get(p.id) ?? p.status));
      await updatePackageStatuses(
        order,
        changes,
        status === "cancelled"
          ? { status, cancelledAt: opts.now, cancelReason: opts.cancelReason ?? opts.note }
          : { status },
        session,
        opts.packageFields ? new Map([[pkg.id, opts.packageFields]]) : undefined,
      );
      await insertOrderEvents(
        order.id,
        [
          {
            packageId: pkg.id,
            fromStatus: pkg.status,
            toStatus: to,
            actorId: admin.id,
            actorRole: "admin",
            note: opts.note,
          },
        ],
        session,
      );
      return { ok: true as const, order, pkg, status };
    });
  } catch (e) {
    if (e instanceof OrderChangedError) return { ok: false, result: CHANGED };
    throw e;
  }
}

/** Live package ids once `pkg` has moved to `to`. */
const liveAfter = (order: OrderForUpdate, pkg: Pkg, to: Pkg["status"]): string[] =>
  livePackageIds(order.packages.map((p) => ({ id: p.id, status: p.id === pkg.id ? to : p.status })));

async function contacts(order: OrderForUpdate, pkg: Pkg) {
  const [customer, shops] = await Promise.all([
    findUserById(order.customerId).catch(() => null),
    findSellerContacts([pkg.sellerId]).catch(() => []),
  ]);
  return { customer, shop: shops[0] ?? null };
}

/** Courier & Tracking panel → "Save & mark as Shipped" (docs/09 §5). */
export async function addTrackingCodeFor(
  user: SessionUser | null,
  input: AddTrackingCodeInput,
  ctx: { ip: string | null; now?: Date },
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  const now = ctx.now ?? new Date();
  const courier = await findActiveCourier(input.courierId);
  if (!courier) return fail("Choose the courier.", { courierId: "Choose the courier" });
  const code = normaliseTrackingCode(input.trackingCode);
  if (!trackingCodeMatches(courier.codePattern, code)) {
    return fail("Check the tracking code.", {
      trackingCode: `That isn't a ${courier.name} tracking code — check it against the courier's slip`,
    });
  }
  const usedOn = await findTrackingCodeUse(courier.name, code);
  if (usedOn) {
    return fail("Check the tracking code.", { trackingCode: `This code is already used on order ${usedOn}` });
  }
  const order = await findOrderForUpdate(input.orderNo);
  if (!order) return fail("We couldn't find that order.");
  if (!validHandOver(input.handedOverAt, order.placedAt, now)) {
    return fail("Check the hand-over time.", {
      handedOverAt: "Use the time the courier took the package — after the order, not in the future",
    });
  }

  const trackingUrl = buildTrackingUrl(courier.trackingUrlTemplate, code);
  const r = await transition(admin, input.orderNo, input.packageId, "ship", {
    note: `Handed to ${courier.name} · ${code}`,
    now,
    packageFields: {
      shipment: {
        courierId: courier.id,
        courierName: courier.name,
        trackingCode: code,
        trackingUrl,
        handedOverAt: input.handedOverAt,
        addedBy: admin.id,
        addedAt: now,
      },
    },
  });
  if (!r.ok) return r.result;

  await audit.log({
    actorId: admin.id,
    actorRole: "admin",
    action: "order.tracking.add",
    entity: "order",
    entityId: input.orderNo,
    data: { packageId: input.packageId, courier: courier.name, trackingCode: code },
    ip: ctx.ip,
  });
  if (input.notify) {
    const { customer, shop } = await contacts(r.order, r.pkg);
    if (customer) {
      await sendShippedEmail(customer.email, customer.name, input.orderNo, {
        shopName: shop?.shopName ?? "the shop",
        courierName: courier.name,
        trackingCode: code,
        trackingUrl,
        amountCents: r.pkg.amountCents,
      }).catch(() => undefined);
    }
  }
  return {
    ok: true,
    message:
      `Shipped with ${courier.name}. ${input.notify ? "The customer was emailed the tracking link." : ""}`.trim(),
  };
}

/** Delivered + COD collected, returned by the courier, or cancelled by Teleshop. */
export async function adminPackageStepFor(
  user: SessionUser | null,
  input: AdminPackageStepInput,
  ctx: { ip: string | null; now?: Date },
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  const now = ctx.now ?? new Date();
  if (input.step === "cancel" && !input.note) {
    return fail("Give a reason — the customer and the shop see it.", { note: "Give a reason" });
  }
  const notes = {
    deliver: "Delivered — Cash on Delivery collected",
    return: `Returned to the shop${input.note ? `: ${input.note}` : ""}`,
    cancel: `Cancelled by Teleshop: ${input.note}`,
  } as const;
  const to = adminSteps[input.step].to;

  const r = await transition(admin, input.orderNo, input.packageId, input.step, {
    note: notes[input.step],
    now,
    cancelReason: notes.cancel,
    async inTx(pkg, order, session) {
      for (const i of pkg.items) {
        // Delivered: reserved units are sold. Returned / cancelled: they go back on sale.
        if (input.step === "deliver") await commitSoldStock(i.sku, i.qty, session);
        else await releaseStock(i.sku, i.qty, session);
      }
      await setPackagePayment(
        order.id,
        pkg.id,
        input.step === "deliver" ? "paid" : "failed",
        now,
        liveAfter(order, pkg, to),
        session,
      );
    },
  });
  if (!r.ok) return r.result;

  await audit.log({
    actorId: admin.id,
    actorRole: "admin",
    action: {
      deliver: "payment.cod.collected",
      return: "order.package.returned",
      cancel: "order.package.cancelled",
    }[input.step],
    entity: "order",
    entityId: input.orderNo,
    data: { packageId: input.packageId, ...(input.note ? { note: input.note } : {}) },
    ip: ctx.ip,
  });

  const { customer, shop } = await contacts(r.order, r.pkg);
  const shopName = shop?.shopName ?? "the shop";
  if (customer) {
    const send =
      input.step === "deliver"
        ? sendDeliveredEmail(customer.email, customer.name, input.orderNo, shopName)
        : input.step === "return"
          ? sendReturnedEmail(customer.email, customer.name, input.orderNo, shopName, input.note)
          : sendCancelledByTeleshopEmail(customer.email, customer.name, input.orderNo, shopName, input.note);
    await send.catch(() => undefined);
  }
  if (input.step === "cancel" && shop) {
    await sendShopPackageCancelledByTeleshopEmail(
      shop.ownerEmail,
      shop.shopName,
      input.orderNo,
      input.note,
    ).catch(() => undefined);
  }
  return {
    ok: true,
    message: {
      deliver: "Marked delivered and COD collected. The shop's payout includes it now.",
      return: "Marked returned. The stock is back on sale and nothing is due.",
      cancel: "Package cancelled. The customer and the shop were emailed.",
    }[input.step],
  };
}

// ---- Reads ----

export async function listOrdersFor(
  user: SessionUser | null,
  f: { status?: OrderStatus; q: string; page: number },
): Promise<{ rows: AdminOrderRowDTO[]; total: number; pageSize: number }> {
  assertRole(user, ["admin"]);
  const pageSize = 25;
  const q = f.q.trim();
  const byOrderNo = orderNoSchema.safeParse(q);
  const byPhone = phoneLK.safeParse(q);
  const filter = {
    status: f.status,
    page: f.page,
    pageSize,
    ...(byOrderNo.success ? { orderNo: byOrderNo.data } : {}),
    ...(!byOrderNo.success && byPhone.success ? { phone: byPhone.data } : {}),
    ...(q.includes("@") ? { email: q } : {}),
  };
  // Something typed that is none of the three: no results rather than everything.
  if (q && !filter.orderNo && !filter.phone && !filter.email) return { rows: [], total: 0, pageSize };
  return { ...(await listAdminOrders(filter)), pageSize };
}

export async function getOrderFor(user: SessionUser | null, orderNo: string): Promise<AdminOrderDTO | null> {
  assertRole(user, ["admin"]);
  return findAdminOrder(orderNo);
}

export async function listCouriersFor(user: SessionUser | null): Promise<CourierDTO[]> {
  assertRole(user, ["admin"]);
  return listActiveCouriers();
}

export async function getTrackingQueueFor(user: SessionUser | null): Promise<TrackingQueueItemDTO[]> {
  assertRole(user, ["admin"]);
  return listTrackingQueue();
}
