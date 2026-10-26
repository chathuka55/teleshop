import { generate } from "otplib";
import { beforeAll, describe, expect, it } from "vitest";
import { AuditLogModel, UserModel } from "@/db/models";
import type { SessionUser } from "@/lib/auth/claims";
import { decryptSecret } from "@/lib/auth/totp";
import {
  confirmEnrolment,
  redeemTwoFactorProof,
  twoFactorScreen,
  verifySecondFactor,
} from "@/modules/auth/two-factor";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_two_factor");

let admin: SessionUser;
let secret = "";
const ip = "203.0.113.5";
const stored = async () =>
  (await UserModel.findById(admin.id).select("+twoFactor").lean())?.twoFactor as {
    enabled: boolean;
    secretEnc: string;
    recoveryHashes: string[];
    lastStep: number;
  };

beforeAll(async () => {
  await Promise.all([UserModel.deleteMany({}), AuditLogModel.deleteMany({})]);
  const u = await UserModel.create({
    email: "admin@test.lk",
    name: "Ada Admin",
    role: "admin",
    passwordHash: "$argon2id$x",
  });
  admin = {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    image: null,
    role: "admin",
    sellerId: null,
    emailVerified: true,
    twoFactorVerified: false,
  };
});

describe("admin TOTP enrolment (P2-T05)", () => {
  it("shows a QR and stores the secret encrypted, reusing it on reload", async () => {
    const first = await twoFactorScreen(admin);
    expect(first.kind).toBe("enrol");
    if (first.kind !== "enrol") return;
    expect(first.qr).toMatch(/^data:image\/svg\+xml;base64,/);
    const t = await stored();
    secret = decryptSecret(t.secretEnc);
    expect(t.secretEnc).not.toContain(secret); // never stored in plain text
    expect(first.manualKey.replace(/ /g, "")).toBe(secret);
    const again = await twoFactorScreen(admin);
    expect(again.kind === "enrol" && again.manualKey).toBe(first.manualKey);
  });

  it("rejects a wrong code, then enables with the right one and returns 10 recovery codes", async () => {
    expect((await confirmEnrolment(admin, "000000", ip)).ok).toBe(false);
    const r = await confirmEnrolment(admin, await generate({ secret }), ip);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recoveryCodes).toHaveLength(10);
    expect(new Set(r.recoveryCodes).size).toBe(10);
    const t = await stored();
    expect(t.enabled).toBe(true);
    expect(t.recoveryHashes).toHaveLength(10);
    expect(JSON.stringify(t.recoveryHashes)).not.toContain(r.recoveryCodes[0]?.replace("-", "") ?? "x");
    // The proof upgrades the session once only.
    expect(await redeemTwoFactorProof(admin.id, r.proof)).toBe(true);
    expect(await redeemTwoFactorProof(admin.id, r.proof)).toBe(false);
    recovery = r.recoveryCodes;
  });
});

let recovery: string[] = [];

describe("admin sign-in step 2", () => {
  it("refuses a code that was already used (replay) and accepts the next one", async () => {
    const used = await generate({ secret });
    expect((await verifySecondFactor(admin, used, ip)).ok).toBe(false);
    const nextStep = Math.floor(Date.now() / 1000) + 30;
    const fresh = await generate({ secret, epoch: nextStep });
    const r = await verifySecondFactor(admin, fresh, ip);
    expect(r.ok).toBe(true);
    expect((await verifySecondFactor(admin, fresh, ip)).ok).toBe(false);
  });

  it("accepts a recovery code once, in any case and with or without the dash", async () => {
    const code = recovery[0] ?? "";
    const r = await verifySecondFactor(admin, code.toLowerCase().replace("-", ""), ip);
    expect(r).toMatchObject({ ok: true, usedRecoveryCode: true });
    expect((await verifySecondFactor(admin, code, ip)).ok).toBe(false);
    expect((await stored()).recoveryHashes).toHaveLength(9);
  });

  it("rejects forged or malformed proofs", async () => {
    expect(await redeemTwoFactorProof(admin.id, "x".repeat(43))).toBe(false);
    expect(await redeemTwoFactorProof(admin.id, { $ne: null })).toBe(false);
    expect(await redeemTwoFactorProof(admin.id, undefined)).toBe(false);
  });

  it("audits enrolment, success, failure and recovery use", async () => {
    const actions = await AuditLogModel.distinct("action", { entityId: admin.id });
    expect(actions).toEqual(
      expect.arrayContaining([
        "auth.totp_enrolled",
        "auth.totp_verified",
        "auth.totp_failed",
        "auth.recovery_code_used",
      ]),
    );
  });
});
