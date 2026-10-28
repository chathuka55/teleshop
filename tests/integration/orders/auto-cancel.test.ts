import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  AuditLogModel,
  InventoryModel,
  OrderEventModel,
  OrderModel,
  ProductModel,
  SellerModel,
  SettingsModel,
  UserModel,
} from "@/db/models";
import { $gte, $ne } from "@/db/operators";
import { createAddress } from "@/db/repositories/address.repository";
import { saveUserCartItems } from "@/db/repositories/cart.repository";
import type { SessionUser } from "@/lib/auth/claims";
import { sellerStepFor } from "@/modules/fulfilment/service";
import { autoCancelUnconfirmed } from "@/modules/orders/auto-cancel";
import { placeOrderFor } from "@/modules/orders/checkout";
import { seedDatabase } from "../../../scripts/seed/seed-db";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_auto_cancel");

const ctx = { ip: "203.0.113.41" };
const HOUR = 3_600_000;
let skuA = "";
let skuB = "";
let shopA: SessionUser;
let n = 0;

async function placeOrder(): Promise<string> {
  const email = `autocancel${++n}@test.lk`;
  const u = await UserModel.create({ email, name: "Nimal Perera", emailVerified: new Date() });
  const user: SessionUser = {
    id: String(u._id),
    name: u.name,
    email,
    image: null,
    role: "customer",
    sellerId: null,
    emailVerified: true,
    twoFactorVerified: false,
  };
  const a = await createAddress(
    user.id,
    {
      label: "home",
      recipientName: "Nimal Perera",
      phone: "+94771234567",
      line1: "12 Temple Road",
      line2: "",
      city: "Kandy",
      district: "Kandy",
      postalCode: "",
    },
    true,
  );
  await saveUserCartItems(user.id, [
    { sku: skuA, qty: 1 },
    { sku: skuB, qty: 1 },
  ]);
  const r = await placeOrderFor(
    user,
    { addressId: a.id, deliveryMethod: "standard", idempotencyKey: randomUUID() },
    ctx,
  );
  if (!r.ok) throw new Error(`placeOrder failed: ${r.code}`);
  return r.orderNo;
}

/** Pretend the order was placed `hours` ago. */
const age = (orderNo: string, hours: number) =>
  OrderModel.updateOne({ orderNo }, { $set: { placedAt: new Date(Date.now() - hours * HOUR) } });

const statuses = async (orderNo: string) => {
  const o = await OrderModel.findOne({ orderNo }).lean();
  // Sorted: the test only cares which statuses the order holds, not the package order.
  return { order: o?.status, packages: o?.packages.map((p) => p.status).sort(), reason: o?.cancelReason };
};

const available = async (sku: string) => (await InventoryModel.findOne({ sku }).lean())?.available;

beforeAll(async () => {
  await seedDatabase({ fixedPassword: "test-password-123" });
  const stocked = new Set(
    (
      await InventoryModel.find({ available: $gte(10) })
        .select("sku")
        .lean()
    ).map((s) => s.sku),
  );
  const first = (await ProductModel.find().select("sellerId variants.sku").lean()).find((p) =>
    p.variants.some((v) => stocked.has(v.sku)),
  );
  if (!first) throw new Error("seed has no stocked product");
  skuA = first.variants.find((v) => stocked.has(v.sku))?.sku ?? "";
  const second = (
    await ProductModel.find({ sellerId: $ne(first.sellerId) })
      .select("variants.sku")
      .lean()
  ).find((p) => p.variants.some((v) => stocked.has(v.sku)));
  if (!second) throw new Error("seed has no stocked product from another shop");
  skuB = second.variants.find((v) => stocked.has(v.sku))?.sku ?? "";

  const s = await SellerModel.findById(first.sellerId).lean();
  const owner = await UserModel.findById(s?.userId).lean();
  shopA = {
    id: String(owner?._id),
    name: owner?.name ?? "Shop",
    email: owner?.email ?? "",
    image: null,
    role: "seller",
    sellerId: String(first.sellerId),
    emailVerified: true,
    twoFactorVerified: false,
  };
}, 120_000);

describe("auto-cancel unaccepted packages (settings.autoCancelHours)", () => {
  it("cancels only packages still waiting after the limit, puts stock back, logs it", async () => {
    const stockB = await available(skuB);
    const stale = await placeOrder(); // shop A accepts, shop B never answers
    const fresh = await placeOrder(); // placed just now: left alone
    const unanswered = await placeOrder(); // nobody answers
    const accepted = await sellerStepFor(shopA, { orderNo: stale, step: "accept" }, ctx);
    expect(accepted.ok).toBe(true);
    await age(stale, 49);
    await age(unanswered, 72);

    const r = await autoCancelUnconfirmed();
    expect(r.failed).toBe(0);
    expect(r.orders).toBeGreaterThanOrEqual(2);

    expect(await statuses(stale)).toMatchObject({
      order: "in_progress",
      packages: ["cancelled", "confirmed"],
    });
    expect(await statuses(unanswered)).toMatchObject({
      order: "cancelled",
      packages: ["cancelled", "cancelled"],
      reason: "Not accepted by the shop within 48 hours",
    });
    expect((await statuses(fresh)).packages).toEqual(["pending", "pending"]);
    // Three orders reserved one B each; two were released, `fresh` still holds its unit.
    expect(await available(skuB)).toBe((stockB ?? 0) - 1);

    const o = await OrderModel.findOne({ orderNo: unanswered }).select("_id").lean();
    const events = await OrderEventModel.find({ orderId: o?._id, toStatus: "cancelled" }).lean();
    expect(events.map((e) => [e.actorRole, e.actorId])).toEqual([
      ["system", null],
      ["system", null],
    ]);
    expect(await AuditLogModel.countDocuments({ action: "order.auto_cancelled", entityId: unanswered })).toBe(
      1,
    );

    // Nothing left to do on the next run.
    expect(await autoCancelUnconfirmed()).toEqual({ orders: 0, packages: 0, failed: 0 });
  });

  it("uses the admin's hours setting", async () => {
    const orderNo = await placeOrder();
    await age(orderNo, 30);
    expect((await autoCancelUnconfirmed()).orders).toBe(0);
    await SettingsModel.updateOne({ _id: "global" }, { $set: { autoCancelHours: 24 } }, { upsert: true });
    expect(await autoCancelUnconfirmed()).toMatchObject({ orders: 1, packages: 2 });
    expect((await statuses(orderNo)).order).toBe("cancelled");
  });
});
