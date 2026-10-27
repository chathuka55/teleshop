import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  CartModel,
  InventoryModel,
  OrderEventModel,
  OrderModel,
  PaymentModel,
  ProductModel,
  UserModel,
} from "@/db/models";
import { $gte, $in } from "@/db/operators";
import { createAddress } from "@/db/repositories/address.repository";
import { saveUserCartItems } from "@/db/repositories/cart.repository";
import { getSettings } from "@/db/repositories/settings.repository";
import type { SessionUser } from "@/lib/auth/claims";
import { placeOrderFor } from "@/modules/orders/checkout";
import { seedDatabase } from "../../../scripts/seed/seed-db";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_checkout");

const ctx = { ip: "203.0.113.20" };
const address = {
  label: "home" as const,
  recipientName: "Nimal Perera",
  phone: "+94771234567",
  line1: "12 Temple Road",
  line2: "",
  city: "Kandy",
  district: "Kandy" as const,
  postalCode: "20000",
};

let skuA = ""; // seller 1
let skuB = ""; // seller 2

async function makeCustomer(
  email: string,
  verified = true,
): Promise<{ user: SessionUser; addressId: string }> {
  const u = await UserModel.create({
    email,
    name: "Test Buyer",
    emailVerified: verified ? new Date() : null,
  });
  const user: SessionUser = {
    id: u._id.toString(),
    name: u.name,
    email,
    image: null,
    role: "customer",
    sellerId: null,
    emailVerified: verified,
    twoFactorVerified: false,
  };
  const a = await createAddress(user.id, address, true);
  return { user, addressId: a.id };
}

const stock = async (sku: string) =>
  InventoryModel.findOne({ sku })
    .select("available reserved")
    .lean<{ available: number; reserved: number }>();

beforeAll(async () => {
  await seedDatabase({ fixedPassword: "test-password-123" });
  // Two in-stock SKUs from two different sellers → two packages.
  const rows = await InventoryModel.find({ available: $gte(3) })
    .select("sku sellerId")
    .lean<{ sku: string; sellerId: { toString(): string } }[]>();
  const first = rows[0];
  const other = rows.find((r) => r.sellerId.toString() !== first?.sellerId.toString());
  if (!first || !other) throw new Error("seed has no suitable SKUs");
  skuA = first.sku;
  skuB = other.sku;
}, 120_000);

beforeEach(async () => {
  await Promise.all([OrderModel.deleteMany({}), PaymentModel.deleteMany({}), OrderEventModel.deleteMany({})]);
});

describe("placeOrder (P4-T04)", () => {
  it("places a 2-package COD order priced from the database and reserves stock", async () => {
    const { user, addressId } = await makeCustomer("happy@test.lk");
    await saveUserCartItems(user.id, [
      { sku: skuA, qty: 2 },
      { sku: skuB, qty: 1 },
    ]);
    const before = { a: await stock(skuA), b: await stock(skuB) };

    const r = await placeOrderFor(
      user,
      { addressId, deliveryMethod: "standard", idempotencyKey: randomUUID() },
      ctx,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.orderNo).toMatch(/^TS-\d{4}-\d{6}$/);

    const order = await OrderModel.findOne({ orderNo: r.orderNo }).lean();
    expect(order?.packages).toHaveLength(2);
    // Every amount comes from the product documents.
    const products = await ProductModel.find({ "variants.sku": $in([skuA, skuB]) }).lean();
    const price = (sku: string) =>
      products.flatMap((p) => p.variants).find((v) => v.sku === sku)?.priceCents ?? -1;
    expect(order?.subtotalCents).toBe(price(skuA) * 2 + price(skuB));
    expect(order?.totalCents).toBe((order?.subtotalCents ?? 0) + (order?.deliveryCents ?? 0));
    expect(order?.deliveryAddress.city).toBe("Kandy");

    expect(await stock(skuA)).toMatchObject({
      available: (before.a?.available ?? 0) - 2,
      reserved: (before.a?.reserved ?? 0) + 2,
    });
    expect((await stock(skuB))?.available).toBe((before.b?.available ?? 0) - 1);

    const payment = await PaymentModel.findOne({ orderId: order?._id }).lean();
    expect(payment).toMatchObject({ method: "cod", status: "pending", amountCents: order?.totalCents });
    expect(payment?.perPackage).toHaveLength(2);
    expect(await OrderEventModel.countDocuments({ orderId: order?._id, toStatus: "pending" })).toBe(1);
    expect((await CartModel.findOne({ userId: user.id }).lean())?.items).toEqual([]);
  });

  it("is idempotent: the same key twice gives one order and one reservation", async () => {
    const { user, addressId } = await makeCustomer("twice@test.lk");
    await saveUserCartItems(user.id, [{ sku: skuA, qty: 1 }]);
    const before = await stock(skuA);
    const input = { addressId, deliveryMethod: "standard" as const, idempotencyKey: randomUUID() };

    const [a, b] = await Promise.all([placeOrderFor(user, input, ctx), placeOrderFor(user, input, ctx)]);
    const third = await placeOrderFor(user, input, ctx);

    expect(a.ok && b.ok && third.ok).toBe(true);
    if (!a.ok || !b.ok || !third.ok) return;
    expect(new Set([a.orderNo, b.orderNo, third.orderNo]).size).toBe(1);
    expect(third.replay).toBe(true);
    expect(await OrderModel.countDocuments({ customerId: user.id })).toBe(1);
    expect((await stock(skuA))?.available).toBe((before?.available ?? 0) - 1);
  });

  it("two buyers, one unit left: exactly one order, stock never below zero", async () => {
    await InventoryModel.updateOne({ sku: skuB }, { $set: { available: 1 } });
    const buyers = await Promise.all([makeCustomer("race1@test.lk"), makeCustomer("race2@test.lk")]);
    for (const b of buyers) await saveUserCartItems(b.user.id, [{ sku: skuB, qty: 1 }]);

    const results = await Promise.all(
      buyers.map((b) =>
        placeOrderFor(
          b.user,
          { addressId: b.addressId, deliveryMethod: "standard", idempotencyKey: randomUUID() },
          ctx,
        ),
      ),
    );

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const loser = results.find((r) => !r.ok);
    expect(loser && !loser.ok && ["OUT_OF_STOCK", "CART_CHANGED"]).toContain(
      loser && !loser.ok ? loser.code : "",
    );
    expect((await stock(skuB))?.available).toBe(0);
    expect(await OrderModel.countDocuments({})).toBe(1);
  });

  it("out of stock rolls back everything (no order, no stock change, cart kept)", async () => {
    const { user, addressId } = await makeCustomer("oos@test.lk");
    await saveUserCartItems(user.id, [
      { sku: skuA, qty: 1 },
      { sku: skuB, qty: 1 },
    ]);
    const before = await stock(skuA);
    // skuB sells out after the cart was priced: force the conditional reservation to fail.
    await InventoryModel.updateOne({ sku: skuB }, { $set: { available: 0 } });

    const r = await placeOrderFor(
      user,
      { addressId, deliveryMethod: "standard", idempotencyKey: randomUUID() },
      ctx,
    );

    expect(r.ok).toBe(false);
    expect(await OrderModel.countDocuments({ customerId: user.id })).toBe(0);
    expect((await stock(skuA))?.available).toBe(before?.available);
    expect((await CartModel.findOne({ userId: user.id }).lean())?.items).toHaveLength(2);
  });

  it("express delivery charges the express fee per package, even for free-delivery items", async () => {
    await InventoryModel.updateOne({ sku: skuB }, { $set: { available: 5 } });
    const { user, addressId } = await makeCustomer("express@test.lk");
    await saveUserCartItems(user.id, [
      { sku: skuA, qty: 1 },
      { sku: skuB, qty: 1 },
    ]);
    const r = await placeOrderFor(
      user,
      { addressId, deliveryMethod: "express", idempotencyKey: randomUUID() },
      ctx,
    );
    if (!r.ok) throw new Error(r.message);
    const order = await OrderModel.findOne({ orderNo: r.orderNo }).lean();
    const { expressFeeCents } = await getSettings();
    expect(order?.deliveryMethod).toBe("express");
    expect(order?.deliveryCents).toBe(expressFeeCents * 2);
  });

  it("refuses unverified emails, other people's addresses and empty carts", async () => {
    const unverified = await makeCustomer("unverified@test.lk", false);
    await saveUserCartItems(unverified.user.id, [{ sku: skuA, qty: 1 }]);
    const key = () => randomUUID();
    expect(
      await placeOrderFor(
        unverified.user,
        { addressId: unverified.addressId, deliveryMethod: "standard", idempotencyKey: key() },
        ctx,
      ),
    ).toMatchObject({ ok: false, code: "EMAIL_UNVERIFIED" });

    const thief = await makeCustomer("thief@test.lk");
    await saveUserCartItems(thief.user.id, [{ sku: skuA, qty: 1 }]);
    const victim = await makeCustomer("victim@test.lk");
    expect(
      await placeOrderFor(
        thief.user,
        { addressId: victim.addressId, deliveryMethod: "standard", idempotencyKey: key() },
        ctx,
      ),
    ).toMatchObject({ ok: false, code: "ADDRESS_NOT_FOUND" });

    const empty = await makeCustomer("empty@test.lk");
    expect(
      await placeOrderFor(
        empty.user,
        { addressId: empty.addressId, deliveryMethod: "standard", idempotencyKey: key() },
        ctx,
      ),
    ).toMatchObject({ ok: false, code: "EMPTY_CART" });
  });

  it("limits open Cash on Delivery orders to 3 per customer", async () => {
    const { user, addressId } = await makeCustomer("many@test.lk");
    for (let i = 0; i < 3; i++) {
      await saveUserCartItems(user.id, [{ sku: skuA, qty: 1 }]);
      const r = await placeOrderFor(
        user,
        { addressId, deliveryMethod: "standard", idempotencyKey: randomUUID() },
        ctx,
      );
      expect(r.ok).toBe(true);
    }
    await saveUserCartItems(user.id, [{ sku: skuA, qty: 1 }]);
    expect(
      await placeOrderFor(user, { addressId, deliveryMethod: "standard", idempotencyKey: randomUUID() }, ctx),
    ).toMatchObject({ ok: false, code: "TOO_MANY_OPEN" });
  });
});
