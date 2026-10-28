import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { InventoryModel, OrderModel, PayoutModel, SellerModel, UserModel } from "@/db/models";
import { $gte } from "@/db/operators";
import { createAddress } from "@/db/repositories/address.repository";
import { saveUserCartItems } from "@/db/repositories/cart.repository";
import type { SessionUser } from "@/lib/auth/claims";
import { placeOrderFor } from "@/modules/orders/checkout";
import { randomBytes } from "node:crypto";
import { decryptDocument, encryptDocument } from "@/lib/security/doc-crypto";
import type { DocumentStore } from "@/lib/storage/documents";
import {
  applyForShopFor,
  readSellerDocumentFor,
  getDashboardFor,
  getPayoutsFor,
  getShopSettingsFor,
  updateShopSettingsFor,
} from "@/modules/sellers/service";
import type { SellerApplicationInput } from "@/modules/auth/schema";
import { seedDatabase } from "../../../scripts/seed/seed-db";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_seller_shop");

const ctx = { ip: "203.0.113.60" };

/** In-memory stand-in for the bucket, with the real encryption (no network in tests). */
const key = randomBytes(32);
const bucket = new Map<string, Buffer>();
const store: DocumentStore = {
  async put(owner, bytes) {
    const path = `kyc/${owner}-${randomBytes(4).toString("hex")}.bin`;
    bucket.set(path, encryptDocument(bytes, key, path));
    return path;
  },
  async read(path) {
    return decryptDocument(bucket.get(path) ?? Buffer.alloc(0), key, path);
  },
  async remove(path) {
    bucket.delete(path);
  },
};
const PDF = new TextEncoder().encode("%PDF-1.7 business registration %%EOF");
const withDoc = { ...ctx, document: PDF, store };
let n = 0;
let shop: SessionUser;
let other: SessionUser;

const person = async (verified = true): Promise<SessionUser> => {
  const email = `owner${++n}@test.lk`;
  const u = await UserModel.create({
    email,
    name: "Kamal Silva",
    emailVerified: verified ? new Date() : null,
  });
  return {
    id: String(u._id),
    name: u.name,
    email,
    image: null,
    role: "customer",
    sellerId: null,
    emailVerified: verified,
    twoFactorVerified: false,
  };
};

const application = (over: Partial<SellerApplicationInput> = {}): SellerApplicationInput => ({
  shopName: "Kandy Mobile Point",
  shopType: "mobile_shop",
  businessRegNo: "PV 00214587",
  addressLine1: "45 Peradeniya Road",
  city: "Kandy",
  district: "Kandy",
  phone: "+94812223344",
  agree: true,
  ...over,
});

const settings = {
  description: "Authorised Apple reseller since 2015.",
  openingHours: "Mon–Sat 9.00–19.00",
  phone: "+94812223344",
  addressLine1: "12 Temple Road",
  city: "Kandy",
  district: "Kandy" as const,
  postalCode: "20000",
  tags: ["Phones", "Apple"],
  dispatchDays: 1,
  payoutBank: "Commercial Bank",
  payoutBranch: "Kandy",
  payoutLast4: "4321",
};

async function sellerUser(slug: string): Promise<SessionUser> {
  const s = await SellerModel.findOne({ slug }).lean();
  const u = await UserModel.findById(s?.userId).lean();
  return {
    id: String(u?._id),
    name: u?.name ?? "",
    email: u?.email ?? "",
    image: null,
    role: "seller",
    sellerId: String(s?._id),
    emailVerified: true,
    twoFactorVerified: false,
  };
}

beforeAll(async () => {
  await seedDatabase({ fixedPassword: "test-password-123" });
  shop = await sellerUser("istore-colombo");
  other = await sellerUser("pc-forge");
}, 120_000);

describe("seller application (P6-T01)", () => {
  it("creates a pending shop once; a second try is refused", async () => {
    const user = await person();
    const r = await applyForShopFor(user, application(), withDoc);
    expect(r.ok).toBe(true);
    const s = await SellerModel.findOne({ userId: user.id }).lean();
    expect([s?.approvalStatus, s?.slug, s?.phone]).toEqual(["pending", "kandy-mobile-point", "+94812223344"]);
    // Still a customer until an admin approves (P7).
    expect((await UserModel.findById(user.id).lean())?.role).toBe("customer");
    expect((await applyForShopFor(user, application(), withDoc)).ok).toBe(false);

    // Another shop with the same name gets its own slug.
    const twin = await person();
    expect((await applyForShopFor(twin, application(), withDoc)).ok).toBe(true);
    expect((await SellerModel.findOne({ userId: twin.id }).lean())?.slug).toMatch(
      /^kandy-mobile-point-[a-f0-9]{4}$/,
    );
  });

  it("needs the business registration; it is stored encrypted and only admins can open it", async () => {
    const user = await person();
    const none = await applyForShopFor(user, application({ shopName: "No Docs Ltd" }), {
      ...withDoc,
      document: null,
    });
    expect(!none.ok && none.fields?.brDocument).toBeTruthy();
    const fake = await applyForShopFor(user, application({ shopName: "No Docs Ltd" }), {
      ...withDoc,
      document: new TextEncoder().encode("<html>not a certificate</html>"),
    });
    expect(fake.ok).toBe(false);

    expect((await applyForShopFor(user, application({ shopName: "Docs Ltd" }), withDoc)).ok).toBe(true);
    const s = await SellerModel.findOne({ userId: user.id }).lean();
    const doc = s?.documents?.[0];
    expect(doc).toMatchObject({
      kind: "business_registration",
      contentType: "application/pdf",
      size: PDF.length,
    });
    // What sits in storage is ciphertext: the PDF bytes never appear in it.
    const sealed = bucket.get(doc?.path ?? "");
    expect(sealed?.includes(Buffer.from("%PDF-"))).toBe(false);

    const admin = { ...(await person()), role: "admin" as const, twoFactorVerified: true };
    const read = await readSellerDocumentFor(admin, String(s?._id), { ip: null, store });
    expect(read?.bytes.equals(Buffer.from(PDF))).toBe(true);
    expect(read?.filename).toBe("business-registration-docs-ltd.pdf");
    await expect(readSellerDocumentFor(user, String(s?._id), { ip: null, store })).rejects.toThrow();
    await expect(readSellerDocumentFor(null, String(s?._id), { ip: null, store })).rejects.toThrow();
    // An admin without the TOTP step is refused too.
    await expect(
      readSellerDocumentFor({ ...admin, twoFactorVerified: false }, String(s?._id), { ip: null, store }),
    ).rejects.toThrow();
  });

  it("needs a verified customer account", async () => {
    expect((await applyForShopFor(await person(false), application(), withDoc)).ok).toBe(false);
    expect((await applyForShopFor(shop, application(), withDoc)).ok).toBe(false);
    expect((await applyForShopFor({ ...(await person()), role: "admin" }, application(), withDoc)).ok).toBe(
      false,
    );
  });

  it("a rejected shop can fix its details and apply again", async () => {
    const user = await person();
    await applyForShopFor(user, application({ shopName: "Galle Gadgets" }), withDoc);
    await SellerModel.updateOne(
      { userId: user.id },
      { $set: { approvalStatus: "rejected", rejectionReason: "Unreadable BR" } },
    );
    const firstDoc = (await SellerModel.findOne({ userId: user.id }).lean())?.documents?.[0]?.path;
    const r = await applyForShopFor(
      user,
      application({ shopName: "Galle Gadgets", businessRegNo: "PV 99887766" }),
      { ...withDoc, document: null },
    );
    expect(r.ok).toBe(true);
    const s = await SellerModel.findOne({ userId: user.id }).lean();
    expect([s?.approvalStatus, s?.rejectionReason, s?.businessRegNo]).toEqual([
      "pending",
      null,
      "PV 99887766",
    ]);
    expect(await SellerModel.countDocuments({ userId: user.id })).toBe(1);
    // No new file: the first certificate is kept.
    expect(s?.documents?.[0]?.path).toBe(firstDoc);
  });
});

describe("shop settings (P6-T05)", () => {
  it("saves the shop's own settings, keeping only the last 4 bank digits", async () => {
    const before = await SellerModel.findById(other.sellerId).lean();
    expect((await updateShopSettingsFor(shop, settings, ctx)).ok).toBe(true);
    const s = await getShopSettingsFor(shop);
    expect(s).toMatchObject({
      description: settings.description,
      tags: ["Phones", "Apple"],
      dispatchDays: 1,
      payoutAccount: { bank: "Commercial Bank", branch: "Kandy", last4: "4321" },
      address: { line1: "12 Temple Road", postalCode: "20000" },
    });
    // The other shop is untouched.
    const after = await SellerModel.findById(other.sellerId).lean();
    expect(after?.description).toBe(before?.description);

    // Clearing the bank fields removes the account.
    await updateShopSettingsFor(
      shop,
      { ...settings, payoutBank: "", payoutBranch: "", payoutLast4: "" },
      ctx,
    );
    expect((await getShopSettingsFor(shop))?.payoutAccount).toBeNull();
  });

  it("a shop that isn't approved can't change settings", async () => {
    const user = await person();
    await applyForShopFor(user, application({ shopName: "Pending Phones" }), withDoc);
    const pending = {
      ...user,
      role: "seller" as const,
      sellerId: String((await SellerModel.findOne({ userId: user.id }).lean())?._id),
    };
    expect((await updateShopSettingsFor(pending, settings, ctx)).ok).toBe(false);
  });
});

describe("payouts and dashboard (P6-T02, T05)", () => {
  it("earns from delivered packages, minus the fee and payouts", async () => {
    const now = new Date();
    // A customer buys from iStore twice; one package is delivered.
    const buyer = await person();
    const a = await createAddress(
      buyer.id,
      {
        label: "home",
        recipientName: "Kamal",
        phone: "+94771234567",
        line1: "1 Main St",
        line2: "",
        city: "Kandy",
        district: "Kandy",
        postalCode: "",
      },
      true,
    );
    const stocked = await InventoryModel.findOne({ sellerId: shop.sellerId, available: $gte(5) }).lean();
    const orderNos: string[] = [];
    for (let i = 0; i < 2; i++) {
      await saveUserCartItems(buyer.id, [{ sku: stocked?.sku ?? "", qty: 1 }]);
      const r = await placeOrderFor(
        buyer,
        { addressId: a.id, deliveryMethod: "standard", idempotencyKey: randomUUID() },
        ctx,
      );
      if (!r.ok) throw new Error(r.code);
      orderNos.push(r.orderNo);
    }
    await OrderModel.updateOne(
      { orderNo: orderNos[0] },
      { $set: { "packages.0.status": "delivered", status: "delivered" } },
    );
    const delivered = (await OrderModel.findOne({ orderNo: orderNos[0] }).lean())?.packages[0];
    const items = delivered?.subtotalCents ?? 0;
    const gross = items + (delivered?.deliveryCents ?? 0);
    const fee = Math.round((items * 300) / 10_000);

    const before = await getPayoutsFor(shop, now);
    expect(before?.month.deliveredPackages).toBeGreaterThanOrEqual(1);

    await PayoutModel.create({
      sellerId: shop.sellerId,
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-01-15"),
      orderCount: 1,
      grossCents: gross,
      feeCents: fee,
      netCents: gross - fee,
      status: "paid",
      paidAt: new Date("2026-01-20"),
    });
    const after = await getPayoutsFor(shop, now);
    expect(after?.paidOutCents).toBe(gross - fee);
    expect(after?.unpaidCents).toBe(Math.max(0, (before?.unpaidCents ?? 0) - (gross - fee)));
    expect(after?.payouts[0]).toMatchObject({ status: "paid", netCents: gross - fee });

    // Another shop sees none of it.
    const otherPayouts = await getPayoutsFor(other, now);
    expect(otherPayouts?.payouts).toEqual([]);

    const kpi = await getDashboardFor(shop, now);
    expect(kpi?.orders).toBeGreaterThanOrEqual(2);
    expect(kpi?.salesCents).toBeGreaterThanOrEqual(gross);
    expect(kpi?.avgOrderCents).toBeGreaterThan(0);
  });
});
