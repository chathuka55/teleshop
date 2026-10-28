import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CategoryModel,
  InventoryModel,
  OrderEventModel,
  OrderModel,
  ProductModel,
  SellerModel,
  UserModel,
} from "@/db/models";
import { $gte, $in, $ne } from "@/db/operators";
import { createAddress } from "@/db/repositories/address.repository";
import { saveUserCartItems } from "@/db/repositories/cart.repository";
import { listSellerPackages } from "@/db/repositories/seller-order.repository";
import type { SessionUser } from "@/lib/auth/claims";
import { getSellerPackageFor, recordSerialsFor, sellerStepFor } from "@/modules/fulfilment/service";
import { placeOrderFor } from "@/modules/orders/checkout";
import { seedDatabase } from "../../../scripts/seed/seed-db";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_fulfilment");

const ctx = { ip: "203.0.113.40" };
let phoneSku = ""; // serial-tracked, shop A
let otherSku = ""; // not serial-tracked, shop B
let shopA: SessionUser;
let shopB: SessionUser;
let shopC: SessionUser; // has no package in the orders below
let n = 0;

async function sellerUser(sellerId: string): Promise<SessionUser> {
  const s = await SellerModel.findById(sellerId).lean();
  const u = await UserModel.findById(s?.userId).lean();
  return {
    id: String(u?._id),
    name: u?.name ?? "Shop",
    email: u?.email ?? "",
    image: null,
    role: "seller",
    sellerId,
    emailVerified: true,
    twoFactorVerified: false,
  };
}

async function placeOrder(phoneQty = 2): Promise<string> {
  const email = `fulfil${++n}@test.lk`;
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
    { sku: phoneSku, qty: phoneQty },
    { sku: otherSku, qty: 1 },
  ]);
  const r = await placeOrderFor(
    user,
    { addressId: a.id, deliveryMethod: "standard", idempotencyKey: randomUUID() },
    ctx,
  );
  if (!r.ok) throw new Error(`placeOrder failed: ${r.code}`);
  return r.orderNo;
}

const pkgStatus = async (orderNo: string, sellerId: string) =>
  (await OrderModel.findOne({ orderNo }).lean())?.packages.find((p) => String(p.sellerId) === sellerId)
    ?.status;

beforeAll(async () => {
  await seedDatabase({ fixedPassword: "test-password-123" });
  const serialCats = await CategoryModel.find({ requiresSerial: true }).select("_id").lean();
  const phones = await ProductModel.find({ categoryId: $in(serialCats.map((c) => c._id)) })
    .select("sellerId variants.sku")
    .lean();
  const stocked = await InventoryModel.find({ available: $gte(10) })
    .select("sku sellerId")
    .lean();
  const inStock = new Set(stocked.map((s) => s.sku));
  const phone = phones.find((p) => p.variants.some((v) => inStock.has(v.sku)));
  if (!phone) throw new Error("seed has no stocked phone");
  phoneSku = phone.variants.find((v) => inStock.has(v.sku))?.sku ?? "";
  const serialIds = new Set(serialCats.map((c) => String(c._id)));
  const others = await ProductModel.find({ sellerId: $ne(phone.sellerId) })
    .select("sellerId categoryId variants.sku")
    .lean();
  const other = others.find(
    (p) => !serialIds.has(String(p.categoryId)) && p.variants.some((v) => inStock.has(v.sku)),
  );
  if (!other) throw new Error("seed has no stocked non-serial product from another shop");
  otherSku = other.variants.find((v) => inStock.has(v.sku))?.sku ?? "";

  shopA = await sellerUser(String(phone.sellerId));
  shopB = await sellerUser(String(other.sellerId));
  const third = (await SellerModel.find().select("_id").lean()).find(
    (s) => String(s._id) !== shopA.sellerId && String(s._id) !== shopB.sellerId,
  );
  if (!third) throw new Error("seed needs a third shop");
  shopC = await sellerUser(String(third._id));
}, 120_000);

describe("seller fulfilment (P6-T04)", () => {
  it("accept → pack → IMEIs → ready to ship, with history and derived order status", async () => {
    const orderNo = await placeOrder(2);
    const step = (step: "accept" | "pack" | "ready") => sellerStepFor(shopA, { orderNo, step }, ctx);

    expect((await sellerStepFor(shopA, { orderNo, step: "pack" }, ctx)).ok).toBe(false); // must accept first
    expect((await step("accept")).ok).toBe(true);
    expect(await pkgStatus(orderNo, shopA.sellerId ?? "")).toBe("confirmed");
    expect((await OrderModel.findOne({ orderNo }).lean())?.status).toBe("in_progress");

    expect((await step("pack")).ok).toBe(true);
    const blocked = await step("ready");
    expect(blocked.ok || blocked.code).toBe("SERIALS_MISSING");

    const pkg = await getSellerPackageFor(shopA, orderNo);
    const phone = pkg?.items.find((i) => i.sku === phoneSku);
    expect(phone?.requiresSerial).toBe(true);
    const tooMany = await recordSerialsFor(
      shopA,
      { orderNo, itemId: phone?.id ?? "", serials: ["356938035643809", "490154203237518", "SN0000001"] },
      ctx,
    );
    expect(tooMany.ok || tooMany.code).toBe("INVALID");
    expect(
      (
        await recordSerialsFor(
          shopA,
          { orderNo, itemId: phone?.id ?? "", serials: ["356938035643809", "490154203237518"] },
          ctx,
        )
      ).ok,
    ).toBe(true);

    expect((await step("ready")).ok).toBe(true);
    expect(await pkgStatus(orderNo, shopA.sellerId ?? "")).toBe("ready_to_ship");
    // Shop B hasn't accepted yet → the order is still in progress.
    expect((await OrderModel.findOne({ orderNo }).lean())?.status).toBe("in_progress");

    const o = await OrderModel.findOne({ orderNo }).lean();
    const events = await OrderEventModel.find({ orderId: o?._id, actorRole: "seller" })
      .sort({ createdAt: 1 })
      .lean();
    expect(events.map((e) => e.toStatus)).toEqual(["confirmed", "processing", "ready_to_ship"]);
    expect(events[0]?.note).toMatch(/^Accepted by /);

    // Serials can't be changed once ready to ship.
    const late = await recordSerialsFor(
      shopA,
      { orderNo, itemId: phone?.id ?? "", serials: ["SN999999"] },
      ctx,
    );
    expect(late.ok || late.code).toBe("WRONG_STATUS");
  });

  it("a shop only ever sees and changes its own package", async () => {
    const orderNo = await placeOrder(1);

    // Shop C has nothing in this order: it looks like a missing order.
    expect(await getSellerPackageFor(shopC, orderNo)).toBeNull();
    const r = await sellerStepFor(shopC, { orderNo, step: "accept" }, ctx);
    expect(r.ok || r.code).toBe("NOT_FOUND");
    expect((await listSellerPackages(shopC.sellerId ?? "")).some((p) => p.orderNo === orderNo)).toBe(false);

    // Shop B's step changes shop B's package and nothing else.
    expect((await sellerStepFor(shopB, { orderNo, step: "accept" }, ctx)).ok).toBe(true);
    expect(await pkgStatus(orderNo, shopB.sellerId ?? "")).toBe("confirmed");
    expect(await pkgStatus(orderNo, shopA.sellerId ?? "")).toBe("pending");

    // Shop B can't record serials on shop A's item, even with the right ids.
    const aItem = (await getSellerPackageFor(shopA, orderNo))?.items[0];
    const steal = await recordSerialsFor(
      shopB,
      { orderNo, itemId: aItem?.id ?? "", serials: ["SN123456"] },
      ctx,
    );
    expect(steal.ok || steal.code).toBe("NOT_FOUND");

    // B's view holds only B's items and amounts.
    const bView = await getSellerPackageFor(shopB, orderNo);
    expect(bView?.items.map((i) => i.sku)).toEqual([otherSku]);
  });

  it("hides the street address and phone until the shop accepts", async () => {
    const orderNo = await placeOrder(1);
    const before = await getSellerPackageFor(shopA, orderNo);
    expect(before?.address).toMatchObject({ city: "Kandy", line1: null, phone: null });
    await sellerStepFor(shopA, { orderNo, step: "accept" }, ctx);
    const after = await getSellerPackageFor(shopA, orderNo);
    expect(after?.address).toMatchObject({ line1: "12 Temple Road", phone: "+94771234567" });
  });

  it("shop cancel releases only its own stock; the other package carries on", async () => {
    const before = await InventoryModel.findOne({ sku: phoneSku }).lean();
    const otherBefore = await InventoryModel.findOne({ sku: otherSku }).lean();
    const orderNo = await placeOrder(2);

    const r = await sellerStepFor(shopA, { orderNo, step: "cancel", reason: "out_of_stock" }, ctx);
    expect(r.ok).toBe(true);
    expect(await pkgStatus(orderNo, shopA.sellerId ?? "")).toBe("cancelled");
    expect(await pkgStatus(orderNo, shopB.sellerId ?? "")).toBe("pending");
    const o = await OrderModel.findOne({ orderNo }).lean();
    expect(o?.status).toBe("pending");
    expect(o?.cancelledAt).toBeNull();

    const after = await InventoryModel.findOne({ sku: phoneSku }).lean();
    expect({ a: after?.available, r: after?.reserved }).toEqual({
      a: before?.available,
      r: before?.reserved,
    });
    const otherAfter = await InventoryModel.findOne({ sku: otherSku }).lean();
    expect(otherAfter?.reserved).toBe((otherBefore?.reserved ?? 0) + 1);

    const view = await getSellerPackageFor(shopA, orderNo);
    expect(view?.cancelReason).toMatch(/out of stock/);

    // Once both are cancelled the order is cancelled.
    await sellerStepFor(shopB, { orderNo, step: "cancel", reason: "other" }, ctx);
    const done = await OrderModel.findOne({ orderNo }).lean();
    expect(done?.status).toBe("cancelled");
    expect(done?.cancelledAt).toBeInstanceOf(Date);
  });
});
