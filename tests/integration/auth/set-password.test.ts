import { beforeAll, describe, expect, it } from "vitest";
import { AuditLogModel, SellerModel, UserModel } from "@/db/models";
import { hashPassword } from "@/lib/auth/password";
import { signInWithPassword } from "@/modules/auth/service";
import { setPasswords } from "../../../scripts/seed/set-password-db";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_set_password");

const ctx = { ip: "203.0.113.9" };

async function makeUser(email: string, role: "customer" | "seller", extra: Record<string, unknown> = {}) {
  return UserModel.create({
    email,
    name: "Test User",
    role,
    passwordHash: await hashPassword("forgotten-password-1"),
    emailVerified: new Date(),
    ...extra,
  });
}

beforeAll(async () => {
  await Promise.all([UserModel.deleteMany({}), SellerModel.deleteMany({}), AuditLogModel.deleteMany({})]);
});

describe("pnpm db:set-password", () => {
  it("sets a password that signs in, clears the lockout and signs out old sessions", async () => {
    const locked = await makeUser("locked@test.lk", "customer", {
      failedLogins: 5,
      lockedUntil: new Date(Date.now() + 10 * 60_000),
      tokenVersion: 2,
    });

    const { updated, notFound } = await setPasswords({ emails: ["LOCKED@test.lk", "nobody@test.lk"] });
    expect(notFound).toEqual(["nobody@test.lk"]);
    expect(updated).toHaveLength(1);
    const password = updated[0]!.password;
    expect(password).toMatch(/^Ts-[\w-]{12}$/);

    const after = await UserModel.findById(locked._id).lean();
    expect(after?.lockedUntil).toBeNull();
    expect(after?.tokenVersion).toBe(3);

    const r = await signInWithPassword({ email: "locked@test.lk", password }, ctx);
    expect(r.ok).toBe(true);
    expect(
      (await signInWithPassword({ email: "locked@test.lk", password: "forgotten-password-1" }, ctx)).ok,
    ).toBe(false);

    const log = await AuditLogModel.findOne({
      entityId: locked._id.toString(),
      action: "auth.password_set_cli",
    }).lean();
    expect(log?.actorRole).toBe("system");
    expect(JSON.stringify(log)).not.toContain(password);
  });

  it("--sellers covers every seller (with the shop name) and nobody else", async () => {
    const owner = await makeUser("shop@test.lk", "seller");
    await makeUser("pending@test.lk", "seller");
    await makeUser("buyer@test.lk", "customer");
    await SellerModel.create({
      userId: owner._id,
      shopName: "Test Shop",
      slug: "test-shop",
      shopType: "mobile_shop",
      businessRegNo: "PV-123",
      address: { line1: "1 Main St", city: "Colombo", district: "Colombo" },
      phone: "+94771234567",
      approvalStatus: "approved",
    });

    const { updated } = await setPasswords({ role: "seller" });
    expect(updated.map((u) => u.email)).toEqual(["pending@test.lk", "shop@test.lk"]);
    expect(updated.find((u) => u.email === "shop@test.lk")?.shop).toEqual({
      shopName: "Test Shop",
      approvalStatus: "approved",
    });
    expect(updated.find((u) => u.email === "pending@test.lk")?.shop).toBeNull();

    const shopPassword = updated.find((u) => u.email === "shop@test.lk")!.password;
    const r = await signInWithPassword({ email: "shop@test.lk", password: shopPassword }, ctx);
    expect(r.ok && r.claims.sellerId).toBeTruthy();
  });
});
