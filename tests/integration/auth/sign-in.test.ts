import { beforeAll, describe, expect, it } from "vitest";
import { AuditLogModel, SellerModel, UserModel } from "@/db/models";
import { hashPassword } from "@/lib/auth/password";
import { refreshClaims, signInWithPassword } from "@/modules/auth/service";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_auth");

const PASSWORD = "correct-horse-battery";
const ctx = { ip: "203.0.113.7" };

async function makeUser(email: string, role: "customer" | "seller" | "admin" = "customer"): Promise<string> {
  const u = await UserModel.create({
    email,
    name: "Test User",
    role,
    passwordHash: await hashPassword(PASSWORD),
    emailVerified: new Date(),
  });
  return u._id.toString();
}

beforeAll(async () => {
  await Promise.all([UserModel.deleteMany({}), SellerModel.deleteMany({}), AuditLogModel.deleteMany({})]);
});

describe("password sign-in on MongoDB (P2-T01)", () => {
  it("signs in with real Argon2id and audits it with a hashed IP", async () => {
    const id = await makeUser("ok@test.lk");
    const r = await signInWithPassword({ email: "OK@test.lk", password: PASSWORD }, ctx);
    expect(r.ok && r.claims.id).toBe(id);

    const log = await AuditLogModel.findOne({ entityId: id, action: "auth.login" }).lean();
    expect(log?.ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(log)).not.toContain(ctx.ip);
  });

  it("locks after 5 wrong passwords; then even the right one fails", async () => {
    const id = await makeUser("lock@test.lk");
    for (let i = 0; i < 5; i++) {
      expect(await signInWithPassword({ email: "lock@test.lk", password: "wrong-password" }, ctx)).toEqual({
        ok: false,
      });
    }
    const u = await UserModel.findById(id).lean();
    expect(u?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
    expect(await signInWithPassword({ email: "lock@test.lk", password: PASSWORD }, ctx)).toEqual({
      ok: false,
    });

    // 15 minutes later the lock has expired.
    const later = new Date(Date.now() + 16 * 60 * 1000);
    const r = await signInWithPassword({ email: "lock@test.lk", password: PASSWORD }, { ...ctx, now: later });
    expect(r.ok).toBe(true);
  });

  it("bumping tokenVersion signs the user out at the next re-check", async () => {
    const id = await makeUser("revoke@test.lk");
    const r = await signInWithPassword({ email: "revoke@test.lk", password: PASSWORD }, ctx);
    if (!r.ok) throw new Error("sign-in failed");

    await UserModel.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
    const due = new Date(r.claims.checkedAt + 6 * 60 * 1000);
    expect(await refreshClaims(r.claims, due)).toBeNull();
  });

  it("gives a seller a sellerId only once the shop is approved", async () => {
    const id = await makeUser("shop@test.lk", "seller");
    const shop = await SellerModel.create({
      userId: id,
      shopName: "Test Shop",
      slug: "test-shop",
      shopType: "mobile_shop",
      businessRegNo: "PV 001234",
      address: { line1: "1 Main St", city: "Colombo", district: "Colombo", postalCode: "00300" },
      phone: "+94771234567",
      approvalStatus: "pending",
    });
    const pending = await signInWithPassword({ email: "shop@test.lk", password: PASSWORD }, ctx);
    expect(pending.ok && pending.claims.sellerId).toBeNull();

    await SellerModel.updateOne({ _id: shop._id }, { $set: { approvalStatus: "approved" } });
    const approved = await signInWithPassword({ email: "shop@test.lk", password: PASSWORD }, ctx);
    expect(approved.ok && approved.claims.sellerId).toBe(shop._id.toString());
  });
});
