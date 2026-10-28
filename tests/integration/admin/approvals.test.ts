import { beforeAll, describe, expect, it } from "vitest";
import { AuditLogModel, ProductModel, SellerModel, UserModel } from "@/db/models";
import { findApprovedSellerIdByUserId } from "@/db/repositories/seller.repository";
import type { SessionUser } from "@/lib/auth/claims";
import { decideSellerFor, getAdminDashboardFor, moderateProductFor } from "@/modules/admin/service";
import { seedDatabase } from "../../../scripts/seed/seed-db";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_admin_approvals");

const ctx = { ip: "203.0.113.80" };
let admin: SessionUser;
let n = 0;

async function application(withDocument = true): Promise<{ sellerId: string; userId: string }> {
  const u = await UserModel.create({
    email: `shop${++n}@test.lk`,
    name: "Kamal Silva",
    emailVerified: new Date(),
  });
  const s = await SellerModel.create({
    userId: u._id,
    shopName: `Kandy Phones ${n}`,
    slug: `kandy-phones-${n}`,
    shopType: "mobile_shop",
    businessRegNo: "PV 00214587",
    address: { line1: "45 Peradeniya Road", city: "Kandy", district: "Kandy" },
    phone: "+94812223344",
    approvalStatus: "pending",
    documents: withDocument
      ? [
          {
            kind: "business_registration",
            path: `kyc/${u._id}-x.bin`,
            contentType: "application/pdf",
            size: 1000,
          },
        ]
      : [],
  });
  return { sellerId: String(s._id), userId: String(u._id) };
}

beforeAll(async () => {
  await seedDatabase({ fixedPassword: "test-password-123" });
  const u = await UserModel.create({
    email: "ops2@test.lk",
    name: "Ops",
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
}, 120_000);

describe("shop approvals (P7-T04, A10)", () => {
  it("approve: the shop opens and its owner becomes a seller", async () => {
    const { sellerId, userId } = await application();
    expect((await getAdminDashboardFor(admin)).pendingSellers).toBeGreaterThan(0);
    const r = await decideSellerFor(admin, { id: sellerId, decision: "approve", reason: "" }, ctx);
    expect(r.ok).toBe(true);
    const s = await SellerModel.findById(sellerId).lean();
    expect([s?.approvalStatus, String(s?.approvedBy)]).toEqual(["approved", admin.id]);
    expect((await UserModel.findById(userId).lean())?.role).toBe("seller");
    // The session re-check (≤ 5 min) now finds the shop.
    expect(await findApprovedSellerIdByUserId(userId)).toBe(sellerId);
    expect(await AuditLogModel.countDocuments({ action: "seller.approved", entityId: sellerId })).toBe(1);
    // Deciding twice is refused.
    expect((await decideSellerFor(admin, { id: sellerId, decision: "reject", reason: "x" }, ctx)).ok).toBe(
      false,
    );
  });

  it("reject needs a reason; no approval without the certificate", async () => {
    const { sellerId, userId } = await application();
    const none = await decideSellerFor(admin, { id: sellerId, decision: "reject", reason: "" }, ctx);
    expect(!none.ok && none.fields?.reason).toBeTruthy();
    expect(
      (await decideSellerFor(admin, { id: sellerId, decision: "reject", reason: "BR unreadable" }, ctx)).ok,
    ).toBe(true);
    const s = await SellerModel.findById(sellerId).lean();
    expect([s?.approvalStatus, s?.rejectionReason]).toEqual(["rejected", "BR unreadable"]);
    expect((await UserModel.findById(userId).lean())?.role).toBe("customer");

    const noDoc = await application(false);
    expect(
      (await decideSellerFor(admin, { id: noDoc.sellerId, decision: "approve", reason: "" }, ctx)).ok,
    ).toBe(false);
  });

  it("is admin-only (with TOTP)", async () => {
    const { sellerId } = await application();
    await expect(
      decideSellerFor(
        { ...admin, twoFactorVerified: false },
        { id: sellerId, decision: "approve", reason: "" },
        ctx,
      ),
    ).rejects.toThrow();
    await expect(
      decideSellerFor({ ...admin, role: "customer" }, { id: sellerId, decision: "approve", reason: "" }, ctx),
    ).rejects.toThrow();
  });
});

describe("product moderation (P7-T03, A5/A6)", () => {
  it("approve publishes; return sends it back with a note; block needs a note", async () => {
    const p = await ProductModel.findOne({ status: "published" }).lean();
    const id = String(p?._id);
    await ProductModel.updateOne({ _id: id }, { $set: { status: "pending_review", publishedAt: null } });

    const back = await moderateProductFor(admin, { id, decision: "return", note: "" }, ctx);
    expect(!back.ok && back.fields?.note).toBeTruthy();
    expect(
      (await moderateProductFor(admin, { id, decision: "return", note: "Use real photos" }, ctx)).ok,
    ).toBe(true);
    let doc = await ProductModel.findById(id).lean();
    expect([doc?.status, doc?.moderationNote]).toEqual(["draft", "Use real photos"]);

    await ProductModel.updateOne({ _id: id }, { $set: { status: "pending_review" } });
    expect((await moderateProductFor(admin, { id, decision: "approve", note: "" }, ctx)).ok).toBe(true);
    doc = await ProductModel.findById(id).lean();
    expect([doc?.status, doc?.moderationNote]).toEqual(["published", null]);
    expect(doc?.publishedAt).toBeInstanceOf(Date);
    // Approving again is refused (it's no longer in review).
    expect((await moderateProductFor(admin, { id, decision: "approve", note: "" }, ctx)).ok).toBe(false);

    expect((await moderateProductFor(admin, { id, decision: "block", note: "Counterfeit" }, ctx)).ok).toBe(
      true,
    );
    expect((await ProductModel.findById(id).lean())?.status).toBe("blocked");
  });
});
