import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  AuditLogModel,
  InventoryModel,
  OrderModel,
  PaymentModel,
  PayoutModel,
  ProductModel,
  ReviewModel,
  SellerModel,
  UserModel,
} from "@/db/models";
import { $gte } from "@/db/operators";
import { createAddress } from "@/db/repositories/address.repository";
import { saveUserCartItems } from "@/db/repositories/cart.repository";
import { findCustomerOrder } from "@/db/repositories/order.repository";
import { findPublishedProductBySlug, searchPublishedProducts } from "@/db/repositories/product.repository";
import type { SessionUser } from "@/lib/auth/claims";
import {
  createPayoutFor,
  listAuditFor,
  listCustomersFor,
  listPayoutCandidatesFor,
  markPayoutPaidFor,
  moderateReviewFor,
  setCustomerStatusFor,
} from "@/modules/admin/people";
import { decideSellerFor } from "@/modules/admin/service";
import { adminPackageStepFor } from "@/modules/orders/admin";
import { placeOrderFor } from "@/modules/orders/checkout";
import { createReviewFor } from "@/modules/reviews/service";
import { seedDatabase } from "../../../scripts/seed/seed-db";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_admin_people");

const ctx = { ip: "203.0.113.90" };
let admin: SessionUser;
let sku = ""; // one shop's in-stock SKU
let shopId = "";
let n = 0;

const asUser = (
  u: { _id: unknown; name: string; email: string },
  role: SessionUser["role"] = "customer",
): SessionUser => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  image: null,
  role,
  sellerId: null,
  emailVerified: true,
  twoFactorVerified: role === "admin",
});

/** A customer's delivered + COD-collected one-package order (via the admin step). */
async function deliveredOrder(): Promise<{ user: SessionUser; orderNo: string; itemId: string }> {
  const u = await UserModel.create({
    email: `ppl${++n}@test.lk`,
    name: "Nimal Perera",
    emailVerified: new Date(),
  });
  const user = asUser(u);
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
  await saveUserCartItems(user.id, [{ sku, qty: 1 }]);
  const r = await placeOrderFor(
    user,
    { addressId: a.id, deliveryMethod: "standard", idempotencyKey: randomUUID() },
    ctx,
  );
  if (!r.ok) throw new Error(r.code);
  await OrderModel.updateOne({ orderNo: r.orderNo }, { $set: { "packages.0.status": "shipped" } });
  const o = await OrderModel.findOne({ orderNo: r.orderNo }).lean();
  const pkg = String(o?.packages[0]?._id);
  const d = await adminPackageStepFor(
    admin,
    { orderNo: r.orderNo, packageId: pkg, step: "deliver", note: "" },
    ctx,
  );
  if (!d.ok) throw new Error(d.message);
  const dto = await findCustomerOrder(user.id, r.orderNo);
  return { user, orderNo: r.orderNo, itemId: dto?.packages[0]?.items[0]?.id ?? "" };
}

beforeAll(async () => {
  await seedDatabase({ fixedPassword: "test-password-123" });
  admin = asUser(
    await UserModel.create({ email: "ops3@test.lk", name: "Ops", role: "admin", emailVerified: new Date() }),
    "admin",
  );
  const row = await InventoryModel.findOne({ available: $gte(20) }).lean();
  if (!row) throw new Error("seed has no stocked SKU");
  sku = row.sku;
  shopId = String(row.sellerId);
}, 120_000);

describe("customers (A9)", () => {
  it("suspends: signed out (tokenVersion) and back; never admins or yourself", async () => {
    const u = await UserModel.create({ email: "bad@test.lk", name: "Bad Buyer", emailVerified: new Date() });
    const before = (await UserModel.findById(u._id).lean())?.tokenVersion ?? 0;

    const noReason = await setCustomerStatusFor(
      admin,
      { id: String(u._id), status: "suspended", reason: "" },
      ctx,
    );
    expect(noReason.ok).toBe(false);
    expect(
      (
        await setCustomerStatusFor(
          admin,
          { id: String(u._id), status: "suspended", reason: "Fake COD orders" },
          ctx,
        )
      ).ok,
    ).toBe(true);
    const after = await UserModel.findById(u._id).lean();
    expect([after?.status, after?.tokenVersion]).toEqual(["suspended", before + 1]);
    expect(
      (await setCustomerStatusFor(admin, { id: String(u._id), status: "suspended", reason: "again" }, ctx))
        .ok,
    ).toBe(false);
    expect(
      (await setCustomerStatusFor(admin, { id: String(u._id), status: "active", reason: "" }, ctx)).ok,
    ).toBe(true);

    expect(
      (await setCustomerStatusFor(admin, { id: admin.id, status: "suspended", reason: "x" }, ctx)).ok,
    ).toBe(false);
    const other = await UserModel.create({ email: "ops4@test.lk", name: "Ops 2", role: "admin" });
    expect(
      (await setCustomerStatusFor(admin, { id: String(other._id), status: "suspended", reason: "x" }, ctx))
        .ok,
    ).toBe(false);
    await expect(
      setCustomerStatusFor(asUser(u), { id: String(other._id), status: "suspended", reason: "x" }, ctx),
    ).rejects.toThrow();
  });

  it("searches by email, name or phone", async () => {
    await UserModel.create({ email: "findme@test.lk", name: "Sunil Fernando", phone: "+94770001122" });
    expect((await listCustomersFor(admin, { q: "findme@", page: 1 })).rows.map((r) => r.email)).toEqual([
      "findme@test.lk",
    ]);
    expect((await listCustomersFor(admin, { q: "sunil fer", page: 1 })).total).toBe(1);
    expect((await listCustomersFor(admin, { q: "077 000 1122", page: 1 })).total).toBe(1);
    // Regex characters are literal, not a pattern.
    expect((await listCustomersFor(admin, { q: ".*", page: 1 })).total).toBe(0);
  });
});

describe("shop suspension (A10)", () => {
  it("hides the shop's products from the store and brings them back", async () => {
    const product = await ProductModel.findOne({ sellerId: shopId, status: "published" }).lean();
    if (!product) throw new Error("shop has no published product");
    expect(await findPublishedProductBySlug(product.slug)).not.toBeNull();

    expect((await decideSellerFor(admin, { id: shopId, decision: "suspend", reason: "" }, ctx)).ok).toBe(
      false,
    );
    expect(
      (await decideSellerFor(admin, { id: shopId, decision: "suspend", reason: "Counterfeit stock" }, ctx))
        .ok,
    ).toBe(true);
    expect(await findPublishedProductBySlug(product.slug)).toBeNull();
    const page = await searchPublishedProducts({ limit: 50 });
    expect(page.items.some((p) => p.id === String(product._id))).toBe(false);
    // The product itself is untouched, so nothing has to be restored by hand.
    expect((await ProductModel.findById(product._id).lean())?.status).toBe("published");

    expect((await decideSellerFor(admin, { id: shopId, decision: "reinstate", reason: "" }, ctx)).ok).toBe(
      true,
    );
    expect(await findPublishedProductBySlug(product.slug)).not.toBeNull();
    expect((await SellerModel.findById(shopId).lean())?.approvalStatus).toBe("approved");
  });
});

describe("reviews (A11)", () => {
  it("hiding takes the rating out of the averages, showing puts it back", async () => {
    const { user, orderNo, itemId } = await deliveredOrder();
    const product = await ProductModel.findOne({ "variants.sku": sku }).lean();
    const base = product?.rating ?? { average: 0, count: 0 };
    expect(
      (await createReviewFor(user, { orderNo, itemId, rating: 1, title: "Spam", comment: "" }, ctx)).ok,
    ).toBe(true);
    const review = await ReviewModel.findOne({ title: "Spam" }).lean();
    const id = String(review?._id);

    expect((await moderateReviewFor(admin, { id, action: "hide", reason: "Off-topic" }, ctx)).ok).toBe(true);
    const hidden = (await ProductModel.findById(product?._id).lean())?.rating;
    expect(hidden?.count).toBe(base.count);
    expect(hidden?.average).toBeCloseTo(base.average, 1);
    expect((await moderateReviewFor(admin, { id, action: "hide", reason: "x" }, ctx)).ok).toBe(false);

    expect((await moderateReviewFor(admin, { id, action: "show", reason: "" }, ctx)).ok).toBe(true);
    expect((await ProductModel.findById(product?._id).lean())?.rating.count).toBe(base.count + 1);
  });
});

describe("payouts", () => {
  it("pays collected COD once: candidate → scheduled → paid, nothing twice", async () => {
    await PayoutModel.deleteMany({});
    await SellerModel.updateOne({ _id: shopId }, { $set: { payoutAccount: null } });
    expect((await createPayoutFor(admin, shopId, ctx)).ok).toBe(false); // no bank account yet
    await SellerModel.updateOne(
      { _id: shopId },
      { $set: { payoutAccount: { bank: "Bank of Ceylon", branch: "Kandy", last4: "4321" } } },
    );
    // Earlier tests in this file already delivered packages for this shop: count from there.
    const base = (await listPayoutCandidatesFor(admin)).find((x) => x.sellerId === shopId)?.packageCount ?? 0;
    await deliveredOrder();
    await deliveredOrder();

    const candidates = await listPayoutCandidatesFor(admin);
    const c = candidates.find((x) => x.sellerId === shopId);
    expect(c?.packageCount).toBe(base + 2);
    expect(c?.netCents).toBe((c?.grossCents ?? 0) - (c?.feeCents ?? 0));

    expect((await createPayoutFor(admin, shopId, ctx)).ok).toBe(true);
    // Everything collected so far is in that payout: nothing left, a second click does nothing.
    expect((await listPayoutCandidatesFor(admin)).some((x) => x.sellerId === shopId)).toBe(false);
    expect((await createPayoutFor(admin, shopId, ctx)).ok).toBe(false);

    const payout = await PayoutModel.findOne({ sellerId: shopId }).lean();
    expect(payout).toMatchObject({ status: "scheduled", grossCents: c?.grossCents, netCents: c?.netCents });
    expect((await markPayoutPaidFor(admin, { id: String(payout?._id), reference: "" }, ctx)).ok).toBe(false);
    expect(
      (await markPayoutPaidFor(admin, { id: String(payout?._id), reference: "BOC-TT-7781" }, ctx)).ok,
    ).toBe(true);
    expect((await markPayoutPaidFor(admin, { id: String(payout?._id), reference: "again" }, ctx)).ok).toBe(
      false,
    );
    const paid = await PayoutModel.findById(payout?._id).lean();
    expect([paid?.status, paid?.reference]).toEqual(["paid", "BOC-TT-7781"]);

    // A new delivery after the payout starts the next period exactly where it ended.
    await deliveredOrder();
    const next = (await listPayoutCandidatesFor(admin)).find((x) => x.sellerId === shopId);
    expect(next?.packageCount).toBe(1);
    expect(next?.periodStart).toBe(paid?.periodEnd.toISOString());
    expect(await PaymentModel.countDocuments({ status: "paid" })).toBeGreaterThanOrEqual(3);
  });
});

describe("audit log (A14)", () => {
  it("filters by group and actor; unknown groups are ignored", async () => {
    const page = await listAuditFor(admin, { action: "payout.", page: 1 });
    expect(page.rows.length).toBeGreaterThan(0);
    expect(page.rows.every((r) => r.action.startsWith("payout."))).toBe(true);
    expect(page.rows.some((r) => r.actorEmail === "ops3@test.lk")).toBe(true);
    const all = await AuditLogModel.countDocuments({});
    expect((await listAuditFor(admin, { action: "^.*", page: 1 })).total).toBe(all);
    expect((await listAuditFor(admin, { actorEmail: "nobody@test.lk", page: 1 })).total).toBe(0);
  });
});
