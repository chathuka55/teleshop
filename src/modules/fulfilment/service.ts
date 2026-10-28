import "server-only";
import { releaseStock } from "@/db/repositories/checkout.repository";
import {
  OrderChangedError,
  findOrderForUpdate,
  insertOrderEvents,
  setItemSerials,
  updatePackageStatuses,
  type OrderForUpdate,
} from "@/db/repositories/order-status.repository";
import { findSellerPackage, serialRequiredProductIds } from "@/db/repositories/seller-order.repository";
import { findShopName } from "@/db/repositories/seller.repository";
import { findUserById } from "@/db/repositories/user.repository";
import { withTransaction } from "@/db/mongoose";
import type { SessionUser } from "@/lib/auth/claims";
import { audit } from "@/modules/audit/service";
import { deriveOrderStatus } from "@/modules/orders/status";
import { canRecordSerials, canSeeFullAddress, canSellerStep, missingSerials, sellerSteps } from "./access";
import { sendPackageCancelledByShopEmail, sendPackageConfirmedEmail } from "./emails";
import { sellerCancelReasons, type RecordSerialsInput, type SellerStepInput } from "./schema";
import type { FulfilmentResult, SellerPackageDTO } from "./types";

/**
 * Seller fulfilment (P6-T04). Every function takes the signed-in seller and only ever finds that
 * seller's own package: another shop's order looks exactly like a missing one.
 */

const fail = (code: Exclude<FulfilmentResult, { ok: true }>["code"], message: string): FulfilmentResult => ({
  ok: false,
  code,
  message,
});
const NOT_FOUND = fail("NOT_FOUND", "We couldn't find that order in your shop.");
const CHANGED = fail("CHANGED", "This order was just updated. Reload the page to see its status.");

type Pkg = OrderForUpdate["packages"][number];

async function loadOwnPackage(
  user: SessionUser,
  orderNo: string,
): Promise<{ order: OrderForUpdate; pkg: Pkg } | null> {
  if (!user.sellerId) return null;
  const order = await findOrderForUpdate(orderNo);
  const pkg = order?.packages.find((p) => p.sellerId === user.sellerId);
  return order && pkg ? { order, pkg } : null;
}

const serialGap = (pkg: Pkg, required: ReadonlySet<string>): number =>
  missingSerials(
    pkg.items.map((i) => ({
      qty: i.qty,
      requiresSerial: required.has(i.productId),
      serialNumbers: i.serialNumbers,
    })),
  );

const stepDone = {
  accept: "Order accepted — the customer has been told.",
  pack: "Marked as packing.",
  ready: "Marked ready to ship. Teleshop adds the courier tracking code at hand-over.",
  cancel: "Package cancelled and the stock is back on sale.",
} as const;

/** Accept → pack → ready to ship, or cancel. One transaction per step, re-checked inside it. */
export async function sellerStepFor(
  user: SessionUser,
  input: SellerStepInput,
  ctx: { ip: string | null; now?: Date },
): Promise<FulfilmentResult> {
  const found = await loadOwnPackage(user, input.orderNo);
  if (!found) return NOT_FOUND;
  const { order, pkg } = found;
  const step = sellerSteps[input.step];
  if (!canSellerStep(input.step, pkg.status)) {
    return fail(
      "WRONG_STATUS",
      `This package is "${pkg.status.replace(/_/g, " ")}" — that step isn't available.`,
    );
  }

  const required =
    input.step === "ready"
      ? await serialRequiredProductIds(pkg.items.map((i) => i.productId))
      : new Set<string>();
  const gap = serialGap(pkg, required);
  if (gap > 0) {
    return fail(
      "SERIALS_MISSING",
      `Record the IMEI/serial number of every phone and laptop first (${gap} missing).`,
    );
  }

  const shop = (await findShopName(pkg.sellerId)) ?? "The shop";
  const reasonText = input.reason ? sellerCancelReasons[input.reason] : "";
  const note = {
    accept: `Accepted by ${shop}`,
    pack: `${shop} is packing your items`,
    ready: "Packed and ready for courier pickup",
    cancel: `Cancelled by ${shop}: ${reasonText}`,
  }[input.step];
  const now = ctx.now ?? new Date();

  try {
    await withTransaction(async (session) => {
      const fresh = await findOrderForUpdate(input.orderNo, session);
      const fp = fresh?.packages.find((p) => p.id === pkg.id);
      if (!fresh || !fp || fp.status !== pkg.status || serialGap(fp, required) > 0) {
        throw new OrderChangedError(input.orderNo);
      }
      if (input.step === "cancel") for (const i of fp.items) await releaseStock(i.sku, i.qty, session);
      const changes = new Map([[fp.id, step.to]]);
      const status = deriveOrderStatus(fresh.packages.map((p) => changes.get(p.id) ?? p.status));
      await updatePackageStatuses(
        fresh,
        changes,
        status === "cancelled" ? { status, cancelledAt: now, cancelReason: note } : { status },
        session,
      );
      await insertOrderEvents(
        fresh.id,
        [
          {
            packageId: fp.id,
            fromStatus: fp.status,
            toStatus: step.to,
            actorId: user.id,
            actorRole: "seller",
            note,
          },
        ],
        session,
      );
    });
  } catch (e) {
    if (e instanceof OrderChangedError) return CHANGED;
    throw e;
  }

  await audit.log({
    actorId: user.id,
    actorRole: "seller",
    action: `fulfilment.${input.step}`,
    entity: "order",
    entityId: order.orderNo,
    data: { packageId: pkg.id, ...(input.reason ? { reason: input.reason } : {}) },
    ip: ctx.ip,
  });

  // After commit, best effort.
  if (input.step === "accept" || input.step === "cancel") {
    const customer = await findUserById(order.customerId).catch(() => null);
    if (customer) {
      await (
        input.step === "accept"
          ? sendPackageConfirmedEmail(customer.email, customer.name, order.orderNo, shop)
          : sendPackageCancelledByShopEmail(
              customer.email,
              customer.name,
              order.orderNo,
              shop,
              reasonText,
              pkg.items,
            )
      ).catch(() => undefined);
    }
  }
  return { ok: true, message: stepDone[input.step] };
}

/** Saves the IMEI/serial numbers of one item (one per unit). Allowed while confirmed or packing. */
export async function recordSerialsFor(
  user: SessionUser,
  input: RecordSerialsInput,
  ctx: { ip: string | null },
): Promise<FulfilmentResult> {
  const found = await loadOwnPackage(user, input.orderNo);
  if (!found) return NOT_FOUND;
  const { order, pkg } = found;
  if (!canRecordSerials(pkg.status)) {
    return fail("WRONG_STATUS", "Serial numbers can be recorded after accepting and before ready to ship.");
  }
  const item = pkg.items.find((i) => i.id === input.itemId);
  if (!item) return NOT_FOUND;
  if (input.serials.length > item.qty) {
    return fail(
      "INVALID",
      `This line has ${item.qty} unit${item.qty === 1 ? "" : "s"} — enter at most that many.`,
    );
  }
  try {
    await setItemSerials(order, pkg.id, item.id, input.serials);
  } catch (e) {
    if (e instanceof OrderChangedError) return CHANGED;
    throw e;
  }
  await audit.log({
    actorId: user.id,
    actorRole: "seller",
    action: "fulfilment.serials",
    entity: "order",
    entityId: order.orderNo,
    data: { itemId: item.id, count: input.serials.length },
    ip: ctx.ip,
  });
  return { ok: true, message: "Serial numbers saved." };
}

/** The shop's package, with the customer's street address and phone hidden until it accepts. */
export async function getSellerPackageFor(
  user: SessionUser,
  orderNo: string,
): Promise<SellerPackageDTO | null> {
  if (!user.sellerId) return null;
  const pkg = await findSellerPackage(user.sellerId, orderNo);
  if (!pkg || canSeeFullAddress(pkg.status)) return pkg;
  return { ...pkg, address: { ...pkg.address, line1: null, line2: null, postalCode: null, phone: null } };
}
