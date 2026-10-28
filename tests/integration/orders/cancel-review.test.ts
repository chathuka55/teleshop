import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  AuditLogModel,
  InventoryModel,
  OrderEventModel,
  OrderModel,
  ProductModel,
  ReviewModel,
  SellerModel,
  UserModel,
} from "@/db/models";
import { $gte } from "@/db/operators";
import { createAddress } from "@/db/repositories/address.repository";
import { saveUserCartItems } from "@/db/repositories/cart.repository";
import { findCustomerOrder } from "@/db/repositories/order.repository";
import type { SessionUser } from "@/lib/auth/claims";
import { cancelOrderFor } from "@/modules/orders/cancel";
import { placeOrderFor } from "@/modules/orders/checkout";
import { createReviewFor, listProductReviews } from "@/modules/reviews/service";
import { seedDatabase } from "../../../scripts/seed/seed-db";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_cancel_review");

const ctx = { ip: "203.0.113.30" };
let skuA = ""; // seller 1
let skuB = ""; // seller 2
let n = 0;

async function customer(name = "Nimal Perera"): Promise<{ user: SessionUser; addressId: string }> {
  const email = `buyer${++n}@test.lk`;
  const u = await UserModel.create({ email, name, emailVerified: new Date() });
  const user: SessionUser = {
    id: u._id.toString(),
    name,
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
      recipientName: name,
      phone: "+94771234567",
      line1: "12 Temple Road",
      line2: "",
      city: "Kandy",
      district: "Kandy",
      postalCode: "",
    },
    true,
  );
  return { user, addressId: a.id };
}

async function order(c: { user: SessionUser; addressId: string }, qtyA = 2, qtyB = 1): Promise<string> {
  await saveUserCartItems(c.user.id, [
    { sku: skuA, qty: qtyA },
    { sku: skuB, qty: qtyB },
  ]);
  const r = await placeOrderFor(
    c.user,
    { addressId: c.addressId, deliveryMethod: "standard", idempotencyKey: randomUUID() },
    ctx,
  );
  if (!r.ok) throw new Error(`placeOrder failed: ${r.code}`);
  return r.orderNo;
}

const stock = async (sku: string) =>
  InventoryModel.findOne({ sku })
    .select("available reserved")
    .lean<{ available: number; reserved: number }>();

const setPackages = (orderNo: string, status: string) =>
  OrderModel.updateOne({ orderNo }, { $set: { "packages.$[].status": status } });

beforeAll(async () => {
  await seedDatabase({ fixedPassword: "test-password-123" });
  const rows = await InventoryModel.find({ available: $gte(20) })
    .select("sku sellerId")
    .lean<{ sku: string; sellerId: { toString(): string } }[]>();
  const first = rows[0];
  const other = rows.find((r) => r.sellerId.toString() !== first?.sellerId.toString());
  if (!first || !other) throw new Error("seed has no suitable SKUs");
  skuA = first.sku;
  skuB = other.sku;
}, 120_000);

describe("cancel order (P5-T04)", () => {
  it("cancels every package, puts the stock back and writes the timeline", async () => {
    const c = await customer();
    const before = { a: await stock(skuA), b: await stock(skuB) };
    const orderNo = await order(c);

    const r = await cancelOrderFor(
      c.user,
      { orderNo, reason: "ordered_by_mistake", note: "wrong colour" },
      ctx,
    );
    expect(r).toEqual({ ok: true });

    const o = await OrderModel.findOne({ orderNo }).lean();
    expect(o?.status).toBe("cancelled");
    expect(o?.packages.map((p) => p.status)).toEqual(["cancelled", "cancelled"]);
    expect(o?.cancelReason).toBe("I ordered by mistake — wrong colour");
    expect(o?.cancelledAt).toBeInstanceOf(Date);
    // Reserved units are on sale again — back to exactly where they were.
    expect(await stock(skuA)).toEqual(before.a);
    expect(await stock(skuB)).toEqual(before.b);

    const events = await OrderEventModel.find({ orderId: o?._id, toStatus: "cancelled" }).lean();
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.actorRole === "customer" && e.fromStatus === "pending")).toBe(true);
    expect(await AuditLogModel.countDocuments({ action: "order.cancelled", entityId: orderNo })).toBe(1);

    // The page shows it: per-package history ends with the cancellation.
    const dto = await findCustomerOrder(c.user.id, orderNo);
    expect(dto?.packages[0]?.timeline.map((t) => t.status)).toEqual(["pending", "cancelled"]);
  });

  it("refuses once a package has shipped, and a second cancel", async () => {
    const c = await customer();
    const shipped = await order(c);
    await OrderModel.updateOne({ orderNo: shipped }, { $set: { "packages.0.status": "shipped" } });
    const r = await cancelOrderFor(c.user, { orderNo: shipped, reason: "changed_mind", note: "" }, ctx);
    expect(r.ok || r.code).toBe("NOT_CANCELLABLE");

    const done = await order(c);
    expect((await cancelOrderFor(c.user, { orderNo: done, reason: "changed_mind", note: "" }, ctx)).ok).toBe(
      true,
    );
    const again = await cancelOrderFor(c.user, { orderNo: done, reason: "changed_mind", note: "" }, ctx);
    expect(again.ok || again.code).toBe("NOT_CANCELLABLE");
  });

  it("treats another customer's order as not found", async () => {
    const owner = await customer();
    const orderNo = await order(owner);
    const stranger = await customer("Kamal Silva");
    const r = await cancelOrderFor(stranger.user, { orderNo, reason: "changed_mind", note: "" }, ctx);
    expect(r.ok || r.code).toBe("NOT_FOUND");
    expect((await OrderModel.findOne({ orderNo }).lean())?.status).toBe("pending");
  });

  it("two cancels at once: one wins, stock is released only once", async () => {
    const c = await customer();
    const before = await stock(skuA);
    const orderNo = await order(c, 3, 1);
    const results = await Promise.all([
      cancelOrderFor(c.user, { orderNo, reason: "changed_mind", note: "" }, ctx),
      cancelOrderFor(c.user, { orderNo, reason: "changed_mind", note: "" }, ctx),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await stock(skuA)).toEqual(before);
  });
});

describe("reviews (P5-T05)", () => {
  it("only after delivery, once per item, and the rating caches move", async () => {
    const c = await customer("Nimal Perera");
    const orderNo = await order(c);
    const dto = await findCustomerOrder(c.user.id, orderNo);
    const item = dto?.packages[0]?.items[0];
    if (!item) throw new Error("no item");
    const input = { orderNo, itemId: item.id, rating: 4, title: "Solid", comment: "Fast delivery." };

    expect((await createReviewFor(c.user, input, ctx)).ok || "x").not.toBe(true); // not delivered yet

    await setPackages(orderNo, "delivered");
    const product = await ProductModel.findOne({ "variants.sku": skuA }).lean();
    const seller = await SellerModel.findById(product?.sellerId).lean();
    const pBefore = product?.rating ?? { average: 0, count: 0 };
    const sBefore = seller?.rating ?? { average: 0, count: 0 };

    const r = await createReviewFor(c.user, input, ctx);
    expect(r).toEqual({ ok: true, productSlug: product?.slug });

    const pAfter = (await ProductModel.findById(product?._id).lean())?.rating;
    expect(pAfter?.count).toBe(pBefore.count + 1);
    expect(pAfter?.average).toBeCloseTo((pBefore.average * pBefore.count + 4) / (pBefore.count + 1), 2);
    expect((await SellerModel.findById(seller?._id).lean())?.rating.count).toBe(sBefore.count + 1);

    const dup = await createReviewFor(c.user, { ...input, rating: 1 }, ctx);
    expect(dup.ok || dup.code).toBe("ALREADY_REVIEWED");
    expect((await ProductModel.findById(product?._id).lean())?.rating.count).toBe(pBefore.count + 1);

    const shown = await listProductReviews(String(product?._id));
    expect(shown[0]).toMatchObject({ rating: 4, title: "Solid", authorName: "Nimal P." });
    expect(JSON.stringify(shown)).not.toContain(c.user.email);

    const mine = await findCustomerOrder(c.user.id, orderNo);
    expect(mine?.packages[0]?.items[0]?.myRating).toBe(4);
  });

  it("refuses someone else's order item and the shop's own product", async () => {
    const c = await customer();
    const orderNo = await order(c);
    await setPackages(orderNo, "delivered");
    const item = (await findCustomerOrder(c.user.id, orderNo))?.packages[0]?.items[0];
    if (!item) throw new Error("no item");
    const input = { orderNo, itemId: item.id, rating: 5, title: "", comment: "" };

    const other = await customer("Kamal Silva");
    const stolen = await createReviewFor(other.user, input, ctx);
    expect(stolen.ok || stolen.code).toBe("NOT_FOUND");

    const o = await OrderModel.findOne({ orderNo }).lean();
    const ownShop = { ...c.user, sellerId: String(o?.packages[0]?.sellerId) };
    const own = await createReviewFor(ownShop, input, ctx);
    expect(own.ok || own.code).toBe("OWN_PRODUCT");
    expect(await ReviewModel.countDocuments({ orderId: o?._id })).toBe(0);
  });

  it("hidden reviews are not listed", async () => {
    const c = await customer();
    const orderNo = await order(c);
    await setPackages(orderNo, "delivered");
    const item = (await findCustomerOrder(c.user.id, orderNo))?.packages[1]?.items[0];
    if (!item) throw new Error("no item");
    expect(
      (
        await createReviewFor(
          c.user,
          { orderNo, itemId: item.id, rating: 2, title: "Hide me", comment: "" },
          ctx,
        )
      ).ok,
    ).toBe(true);
    const review = await ReviewModel.findOneAndUpdate({ title: "Hide me" }, { status: "hidden" }).lean();
    const shown = await listProductReviews(String(review?.productId));
    expect(shown.some((r) => r.title === "Hide me")).toBe(false);
  });
});
