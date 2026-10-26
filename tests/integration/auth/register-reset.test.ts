import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/** Captures outgoing auth emails so the test can follow the links. */
const sent = vi.hoisted(() => [] as { kind: string; to: string; token?: string }[]);
vi.mock("@/modules/auth/emails", () => ({
  sendVerificationEmail: async (to: string, _name: string, token: string) => {
    sent.push({ kind: "verify", to, token });
    return { sent: true };
  },
  sendAlreadyRegisteredEmail: async (to: string) => {
    sent.push({ kind: "already", to });
    return { sent: true };
  },
  sendPasswordResetEmail: async (to: string, _name: string, token: string) => {
    sent.push({ kind: "reset", to, token });
    return { sent: true };
  },
}));
// The breach API is never called from tests.
vi.mock("@/lib/auth/breached", () => ({
  isBreachedPassword: async (p: string) => p === "breached-password-1",
}));

const { PasswordResetModel, UserModel, VerificationTokenModel } = await import("@/db/models");
const {
  refreshClaims,
  registerCustomer,
  requestPasswordReset,
  resetPassword,
  signInWithPassword,
  verifyEmail,
} = await import("@/modules/auth/service");
const { connectTestDatabase } = await import("../../support/db");

connectTestDatabase("t_auth_register");

const ctx = { ip: "203.0.113.9" };
const input = {
  name: "Kamal Silva",
  email: "kamal@test.lk",
  phone: "+94771234567",
  password: "a-long-new-password",
};
const last = (kind: string) => [...sent].reverse().find((m) => m.kind === kind);

beforeAll(async () => {
  await Promise.all([
    UserModel.deleteMany({}),
    VerificationTokenModel.deleteMany({}),
    PasswordResetModel.deleteMany({}),
  ]);
});
beforeEach(() => {
  sent.length = 0;
});

describe("register + verify (P2-T02)", () => {
  it("creates an unverified customer and emails a single-use link stored only as a hash", async () => {
    expect(await registerCustomer(input, ctx)).toEqual({ ok: true });
    const user = await UserModel.findOne({ email: input.email }).select("+passwordHash").lean();
    expect(user?.role).toBe("customer");
    expect(user?.emailVerified).toBeNull();
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);

    const token = last("verify")?.token ?? "";
    expect(await VerificationTokenModel.countDocuments({ tokenHash: token })).toBe(0);

    expect(await verifyEmail(token, ctx)).toBe(true);
    expect((await UserModel.findOne({ email: input.email }).lean())?.emailVerified).toBeInstanceOf(Date);
    expect(await verifyEmail(token, ctx)).toBe(false); // single use
  });

  it("answers the same for an existing email and emails the owner instead", async () => {
    expect(await registerCustomer({ ...input, name: "Someone Else" }, ctx)).toEqual({ ok: true });
    expect(await UserModel.countDocuments({ email: input.email })).toBe(1);
    expect(sent.map((m) => m.kind)).toEqual(["already"]);
  });

  it("refuses a breached password", async () => {
    const r = await registerCustomer(
      { ...input, email: "new@test.lk", password: "breached-password-1" },
      ctx,
    );
    expect(r.ok).toBe(false);
    expect(await UserModel.countDocuments({ email: "new@test.lk" })).toBe(0);
  });

  it("rejects an expired verification link", async () => {
    await registerCustomer({ ...input, email: "late@test.lk" }, ctx);
    const token = last("verify")?.token ?? "";
    expect(await verifyEmail(token, { ...ctx, now: new Date(Date.now() + 25 * 60 * 60 * 1000) })).toBe(false);
  });
});

describe("forgot / reset password (P2-T03)", () => {
  it("sends nothing for unknown emails, without saying so", async () => {
    await requestPasswordReset("nobody@test.lk", ctx);
    expect(sent).toEqual([]);
  });

  it("resets once, signs out other sessions and lets the new password in", async () => {
    const before = await signInWithPassword({ email: input.email, password: input.password }, ctx);
    if (!before.ok) throw new Error("sign-in failed");

    await requestPasswordReset(input.email, ctx);
    const token = last("reset")?.token ?? "";

    expect(await resetPassword({ token, password: "breached-password-1" }, ctx)).toMatchObject({
      ok: false,
      reason: "breached",
    });
    expect(await resetPassword({ token, password: "another-long-password" }, ctx)).toEqual({ ok: true });
    const stored = await UserModel.findOne({ email: input.email }).select("+passwordHash").lean();
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/); // not swallowed as a "$field" path
    expect(await resetPassword({ token, password: "third-long-password" }, ctx)).toEqual({
      ok: false,
      reason: "invalid",
    });

    // Old session is revoked at its next re-check; old password no longer works; new one does.
    expect(await refreshClaims(before.claims, new Date(before.claims.checkedAt + 6 * 60 * 1000))).toBeNull();
    expect((await signInWithPassword({ email: input.email, password: input.password }, ctx)).ok).toBe(false);
    expect(
      (await signInWithPassword({ email: input.email, password: "another-long-password" }, ctx)).ok,
    ).toBe(true);
  });

  it("a reset link expires after 30 minutes and a newer link replaces the old one", async () => {
    await requestPasswordReset(input.email, ctx);
    const first = last("reset")?.token ?? "";
    await requestPasswordReset(input.email, ctx);
    const second = last("reset")?.token ?? "";

    expect(await resetPassword({ token: first, password: "fourth-long-password" }, ctx)).toMatchObject({
      ok: false,
    });
    const late = { ...ctx, now: new Date(Date.now() + 31 * 60 * 1000) };
    expect(await resetPassword({ token: second, password: "fourth-long-password" }, late)).toMatchObject({
      ok: false,
    });
  });
});
