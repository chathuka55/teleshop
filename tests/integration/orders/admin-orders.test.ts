import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  AuditLogModel,
  CourierModel,
  InventoryModel,
  OrderEventModel,
  OrderModel,
  PaymentModel,
  UserModel,
} from "@/db/models";
import { $gte } from "@/db/operators";
import { createAddress } from "@/db/repositories/address.repository";
import { saveUserCartItems } from "@/db/repositories/cart.repository";
import type { SessionUser } from "@/lib/auth/claims";
import {
  addTrackingCodeFor,
  adminPackageStepFor,
  getOrderFor,
  getTrackingQueueFor,
  listOrdersFor,
} from "@/modules/orders/admin";
import { placeOrderFor } from "@/modules/orders/checkout";
import { seedDatabase } from "../../../scripts/seed/seed-db";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_admin_orders");

const ctx = { ip: "203.0.113.70" };
let admin: SessionUser;
let courierId = "";
let skuA = "";
let skuB = "";
let n = 0;

/** The courier took it just now (after the order was placed). */
const handedOver = (): Date => new Date();

async function placeTwoPackageOrder(): Promise<{ orderNo: string; pkgA: string; pkgB: string }> {
  const email = `adm-buyer${++n}@test.lk`;
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
      recipientName: "Nimal",
      phone: "+94771234567",
      line1: "1 Main St",
      line2: "",
      city: "Kandy",
      district: "Kandy",
      postalCode: "",
    },
    true,
  );
  await saveUserCartItems(user.id, [
    { sku: skuA, qty: 2 },
    { sku: skuB, qty: 1 },
  ]);
  const r = await placeOrderFor(
    user,
    { addressId: a.id, deliveryMethod: "standard", idempotencyKey: randomUUID() },
    ctx,
  );
  if (!r.ok) throw new Error(r.code);
  const o = await OrderModel.findOne({ orderNo: r.orderNo }).lean();
  const pkgA = o?.packages.find((p) => p.items.some((i) => i.sku === skuA));
  const pkgB = o?.packages.find((p) => p.items.some((i) => i.sku === skuB));
  // The shops have packed: package A is ready for the courier.
  await OrderModel.updateOne(
    { orderNo: r.orderNo, "packages._id": pkgA?._id },
    { $set: { "packages.$.status": "ready_to_ship", status: "in_progress" } },
  );
  return { orderNo: r.orderNo, pkgA: String(pkgA?._id), pkgB: String(pkgB?._id) };
}

const ship = (orderNo: string, packageId: string, trackingCode: string, at = handedOver()) =>
  addTrackingCodeFor(
    admin,
    { orderNo, packageId, courierId, trackingCode, handedOverAt: at, notify: false },
    ctx,
  );

const stock = (sku: string) => InventoryModel.findOne({ sku }).select("onHand reserved available").lean();

beforeAll(async () => {
  await seedDatabase({ fixedPassword: "test-password-123" });
  const u = await UserModel.create({
    email: "ops@test.lk",
    name: "Ops Admin",
    role: "admin",
    emailVerified: new Date(),
  });
  admin = {
    id: String(u._id),
    name: u.name,
    email: u.email,
    image: null,
    role: "admin",
    sellerId: null,
    emailVerified: true,
    twoFactorVerified: true,
  };
  courierId = String((await CourierModel.findOne({ name: "Prompt Xpress" }).lean())?._id);
  const rows = await InventoryModel.find({ available: $gte(20) })
    .select("sku sellerId")
    .lean();
  const first = rows[0];
  const other = rows.find((r) => String(r.sellerId) !== String(first?.sellerId));
  skuA = first?.sku ?? "";
  skuB = other?.sku ?? "";
}, 120_000);

describe("addTrackingCode (P7-T02, docs/09 §5)", () => {
  it("checks the courier format, ships the package, builds the link and logs it", async () => {
    const { orderNo, pkgA, pkgB } = await placeTwoPackageOrder();

    const bad = await ship(orderNo, pkgA, "DX123456789");
    expect(!bad.ok && bad.fields?.trackingCode).toMatch(/Prompt Xpress/);
    const notReady = await ship(orderNo, pkgB, "PX-0000 0001 LK");
    expect(notReady.ok).toBe(false);
    const future = await ship(orderNo, pkgA, "PX-0000 0002 LK", new Date(Date.now() + 3_600_000));
    expect(!future.ok && future.fields?.handedOverAt).toBeTruthy();

    const r = await ship(orderNo, pkgA, "  px-5555   2093 lk ");
    expect(r.ok).toBe(true);
    const o = await OrderModel.findOne({ orderNo }).lean();
    const p = o?.packages.find((x) => String(x._id) === pkgA);
    expect(p?.status).toBe("shipped");
    expect(p?.shipment).toMatchObject({
      courierName: "Prompt Xpress",
      trackingCode: "PX-5555 2093 LK",
      trackingUrl: "https://promptxpress.lk/track?code=PX-5555%202093%20LK",
    });
    expect(String(p?.shipment?.addedBy)).toBe(admin.id);
    expect(
      await OrderEventModel.countDocuments({ orderId: o?._id, toStatus: "shipped", actorRole: "admin" }),
    ).toBe(1);
    expect(await AuditLogModel.countDocuments({ action: "order.tracking.add", entityId: orderNo })).toBe(1);

    // The same code can't go on a second package.
    const again = await placeTwoPackageOrder();
    const dup = await ship(again.orderNo, again.pkgA, "PX-5555 2093 LK");
    expect(!dup.ok && dup.fields?.trackingCode).toMatch(orderNo);
  });

  it("is for admins who passed two-step verification only", async () => {
    const { orderNo, pkgA } = await placeTwoPackageOrder();
    const input = {
      orderNo,
      packageId: pkgA,
      courierId,
      trackingCode: "PX-1111 2222 LK",
      handedOverAt: handedOver(),
      notify: false,
    };
    await expect(addTrackingCodeFor({ ...admin, twoFactorVerified: false }, input, ctx)).rejects.toThrow();
    await expect(
      addTrackingCodeFor({ ...admin, role: "seller", sellerId: "x".repeat(24) }, input, ctx),
    ).rejects.toThrow();
    await expect(addTrackingCodeFor(null, input, ctx)).rejects.toThrow();
    await expect(listOrdersFor({ ...admin, role: "customer" }, { q: "", page: 1 })).rejects.toThrow();
  });
});

describe("tracking queue (P7-T01)", () => {
  it("lists packed packages, even without a 'ready' event (falls back to the order date)", async () => {
    const { orderNo, pkgA } = await placeTwoPackageOrder();
    const queue = await getTrackingQueueFor(admin);
    const item = queue.find((q) => q.packageId === pkgA);
    expect(item).toMatchObject({ orderNo });
    expect(Number.isNaN(Date.parse(item?.readySince ?? ""))).toBe(false);
  });
});

describe("delivered + COD, returned, cancelled (P7-T02)", () => {
  it("delivered: stock is sold, the package is paid, the order follows its packages", async () => {
    const { orderNo, pkgA, pkgB } = await placeTwoPackageOrder();
    await ship(orderNo, pkgA, "PX-3000 0001 LK");
    const before = await stock(skuA);

    expect(
      (await adminPackageStepFor(admin, { orderNo, packageId: pkgA, step: "deliver", note: "" }, ctx)).ok,
    ).toBe(true);
    const after = await stock(skuA);
    expect([after?.onHand, after?.reserved, after?.available]).toEqual([
      (before?.onHand ?? 0) - 2,
      (before?.reserved ?? 0) - 2,
      before?.available,
    ]);
    const o = await OrderModel.findOne({ orderNo }).lean();
    expect(o?.status).toBe("partially_delivered");
    let pay = await PaymentModel.findOne({ orderId: o?._id }).lean();
    expect(pay?.perPackage.find((x) => String(x.packageId) === pkgA)?.status).toBe("paid");
    expect(pay?.status).toBe("pending"); // package B is still to be collected

    // Cancelling B (needs a reason) leaves only the delivered package → paid in full.
    const noReason = await adminPackageStepFor(
      admin,
      { orderNo, packageId: pkgB, step: "cancel", note: "" },
      ctx,
    );
    expect(!noReason.ok && noReason.fields?.note).toBeTruthy();
    const bBefore = await stock(skuB);
    expect(
      (
        await adminPackageStepFor(
          admin,
          { orderNo, packageId: pkgB, step: "cancel", note: "Shop closed for repairs" },
          ctx,
        )
      ).ok,
    ).toBe(true);
    expect((await stock(skuB))?.available).toBe((bBefore?.available ?? 0) + 1);
    pay = await PaymentModel.findOne({ orderId: o?._id }).lean();
    expect(pay?.status).toBe("paid");
    expect((await OrderModel.findOne({ orderNo }).lean())?.status).toBe("delivered");

    // Steps only from the right status.
    const twice = await adminPackageStepFor(
      admin,
      { orderNo, packageId: pkgA, step: "deliver", note: "" },
      ctx,
    );
    expect(twice.ok).toBe(false);
  });

  it("returned: stock goes back on sale and nothing is due", async () => {
    const { orderNo, pkgA, pkgB } = await placeTwoPackageOrder();
    await ship(orderNo, pkgA, "PX-3000 0002 LK");
    const before = await stock(skuA);
    expect(
      (
        await adminPackageStepFor(
          admin,
          { orderNo, packageId: pkgA, step: "return", note: "Customer not home 3 times" },
          ctx,
        )
      ).ok,
    ).toBe(true);
    const after = await stock(skuA);
    expect([after?.available, after?.reserved]).toEqual([
      (before?.available ?? 0) + 2,
      (before?.reserved ?? 0) - 2,
    ]);
    const o = await OrderModel.findOne({ orderNo }).lean();
    const pay = await PaymentModel.findOne({ orderId: o?._id }).lean();
    expect(pay?.perPackage.find((x) => String(x.packageId) === pkgA)?.status).toBe("failed");
    expect(o?.packages.find((p) => String(p._id) === pkgB)?.status).toBe("pending");
  });

  it("admin search: order number, phone or customer email", async () => {
    const { orderNo } = await placeTwoPackageOrder();
    expect(
      (await listOrdersFor(admin, { q: orderNo.toLowerCase(), page: 1 })).rows.map((r) => r.orderNo),
    ).toEqual([orderNo]);
    expect((await listOrdersFor(admin, { q: "077 123 4567", page: 1 })).total).toBeGreaterThan(0);
    expect((await listOrdersFor(admin, { q: `adm-buyer${n}@test.lk`, page: 1 })).rows[0]?.orderNo).toBe(
      orderNo,
    );
    expect((await listOrdersFor(admin, { q: "nonsense", page: 1 })).total).toBe(0);
    const detail = await getOrderFor(admin, orderNo);
    expect(detail?.customer?.email).toBe(`adm-buyer${n}@test.lk`);
    expect(detail?.packages).toHaveLength(2);
  });
});
