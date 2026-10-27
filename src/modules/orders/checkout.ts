import "server-only";
import { findAddress } from "@/db/repositories/address.repository";
import { clearUserCart, getUserCartItems } from "@/db/repositories/cart.repository";
import {
  OutOfStockError,
  countOpenOrders,
  findOrderNoByIdempotencyKey,
  insertOrder,
  nextOrderNo,
  reserveStock,
  type NewOrderPackage,
} from "@/db/repositories/checkout.repository";
import { findLeanSellers } from "@/db/repositories/seller.repository";
import { getSettings } from "@/db/repositories/settings.repository";
import { withTransaction } from "@/db/mongoose";
import type { SessionUser } from "@/lib/auth/claims";
import { audit } from "@/modules/audit/service";
import { priceCart } from "@/modules/cart/pricing";
import type { PricedCartDTO } from "@/modules/cart/types";
import { getProductsBySkus } from "@/modules/catalog/service";
import { sendOrderConfirmationEmail } from "./emails";
import type { PlaceOrderInput } from "./schema";
import type { PlaceOrderResult } from "./types";

/** Unverified accounts / too many open orders are the main fake-COD controls (docs/10 §1). */
export const MAX_OPEN_ORDERS = 3;

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

const fail = (code: Exclude<PlaceOrderResult, { ok: true }>["code"], message: string): PlaceOrderResult => ({
  ok: false,
  code,
  message,
});

/**
 * Places a Cash on Delivery order from the user's saved cart (P4-T04):
 *  1. idempotent — the same `idempotencyKey` returns the first order, never a second one;
 *  2. prices, delivery fees and totals come from the database, nothing from the browser;
 *  3. one package per seller;
 *  4. inside one transaction: order number, stock reservation (conditional — no overselling),
 *     order + payment + first timeline event, empty cart. Any failure rolls everything back.
 */
export async function placeOrderFor(
  user: SessionUser,
  input: PlaceOrderInput,
  ctx: { ip: string | null; now?: Date },
): Promise<PlaceOrderResult> {
  const replay = await findOrderNoByIdempotencyKey(user.id, input.idempotencyKey);
  if (replay) return { ok: true, orderNo: replay, replay: true };

  if (user.role !== "customer" && user.role !== "seller") {
    return fail("NOT_ALLOWED", "Staff accounts can't place orders.");
  }
  if (!user.emailVerified) {
    return fail("EMAIL_UNVERIFIED", "Please verify your email before placing a Cash on Delivery order.");
  }
  const settings = await getSettings();
  if (!settings.codEnabled)
    return fail("COD_DISABLED", "Cash on Delivery is paused right now. Please try again later.");
  if ((await countOpenOrders(user.id)) >= MAX_OPEN_ORDERS) {
    return fail(
      "TOO_MANY_OPEN",
      `You already have ${MAX_OPEN_ORDERS} orders on the way. Please wait until one is delivered.`,
    );
  }

  const address = await findAddress(user.id, input.addressId);
  if (!address) return fail("ADDRESS_NOT_FOUND", "Choose a delivery address.");

  const items = await getUserCartItems(user.id);
  if (!items.length) return fail("EMPTY_CART", "Your cart is empty.");

  // ---- price from the database ----
  const products = await getProductsBySkus(items.map((i) => i.sku));
  const express = input.deliveryMethod === "express";
  const priced: PricedCartDTO = priceCart(items, products, {
    deliveryFeeCents: express ? settings.expressFeeCents : settings.deliveryFeeCents,
    honourFreeDelivery: !express,
  });
  const changed =
    priced.unavailable.length > 0 || priced.packages.some((p) => p.lines.some((l) => l.adjusted));
  if (changed || !priced.packages.length) {
    return fail("CART_CHANGED", "Some items sold out or changed. Please review your cart.");
  }

  const productBySku = new Map(products.flatMap((p) => p.variants.map((v) => [v.sku, p] as const)));
  const sellers = await findLeanSellers({ slugs: priced.packages.map((p) => p.seller.slug) });
  const sellerId = new Map(sellers.map((s) => [s.slug, s._id.toString()]));

  const packages: NewOrderPackage[] = priced.packages.map((p) => ({
    sellerId: sellerId.get(p.seller.slug) ?? "",
    subtotalCents: p.subtotalCents,
    deliveryCents: p.deliveryCents,
    items: p.lines.map((l) => {
      const product = productBySku.get(l.sku);
      return {
        productId: product?.id ?? "",
        sku: l.sku,
        name: l.name,
        variantLabel: l.variantLabel,
        imageUrl: l.imageUrl,
        unitPriceCents: l.unitPriceCents,
        qty: l.qty,
        lineTotalCents: l.lineTotalCents,
        warrantyMonths: product?.warranty.months ?? 0,
      };
    }),
  }));
  if (packages.some((p) => !p.sellerId || p.items.some((i) => !i.productId))) {
    return fail("CART_CHANGED", "Some items are no longer sold. Please review your cart.");
  }

  // ---- one transaction: number, stock, order, payment, event, cart ----
  let orderNo: string;
  try {
    orderNo = await withTransaction(async (session) => {
      const no = await nextOrderNo(session, ctx.now);
      for (const p of packages) for (const i of p.items) await reserveStock(i.sku, i.qty, session);
      await insertOrder(
        {
          customerId: user.id,
          idempotencyKey: input.idempotencyKey,
          deliveryAddress: {
            recipientName: address.recipientName,
            phone: address.phone,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            district: address.district,
            postalCode: address.postalCode,
          },
          deliveryMethod: input.deliveryMethod,
          subtotalCents: priced.subtotalCents,
          deliveryCents: priced.deliveryCents,
          totalCents: priced.totalCents,
          packages,
        },
        no,
        { id: user.id, role: user.role },
        session,
        ctx.now,
      );
      await clearUserCart(user.id, session);
      return no;
    });
  } catch (e) {
    if (e instanceof OutOfStockError) {
      return fail("OUT_OF_STOCK", "Sorry — an item just sold out. Your cart has been updated.");
    }
    if (isDuplicateKey(e)) {
      // The same checkout was submitted twice at once: the other request created the order.
      const existing = await findOrderNoByIdempotencyKey(user.id, input.idempotencyKey);
      if (existing) return { ok: true, orderNo: existing, replay: true };
    }
    throw e;
  }

  await audit.log({
    actorId: user.id,
    actorRole: user.role,
    action: "order.placed",
    entity: "order",
    entityId: orderNo,
    data: { totalCents: priced.totalCents, packages: packages.length },
    ip: ctx.ip,
  });
  // After commit, best effort: a mail outage never undoes an order.
  await sendOrderConfirmationEmail(user.email, user.name, orderNo, priced, address).catch(() => undefined);
  return { ok: true, orderNo, replay: false };
}
