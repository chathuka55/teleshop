import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenClaims } from "@/lib/auth/claims";

const repo = vi.hoisted(() => ({
  findLoginRecordByEmail: vi.fn(),
  findAuthState: vi.fn(),
  incrementFailedLogins: vi.fn(),
  lockUserUntil: vi.fn(),
  recordSuccessfulLogin: vi.fn(),
  createUser: vi.fn(),
  markEmailVerified: vi.fn(),
}));
const accounts = vi.hoisted(() => ({ findUserIdByAccount: vi.fn(), linkAccount: vi.fn() }));
const sellers = vi.hoisted(() => ({ findApprovedSellerIdByUserId: vi.fn() }));
const auditLog = vi.hoisted(() => vi.fn());
const pw = vi.hoisted(() => ({ hashPassword: vi.fn(), verifyPassword: vi.fn() }));

vi.mock("@/db/repositories/user.repository", () => repo);
vi.mock("@/db/repositories/account.repository", () => accounts);
vi.mock("@/db/repositories/seller.repository", () => sellers);
vi.mock("@/modules/audit/service", () => ({ audit: { log: auditLog } }));
vi.mock("@/lib/auth/password", () => pw);

const { refreshClaims, signInWithGoogle, signInWithPassword } = await import("@/modules/auth/service");

const ID = "64b000000000000000000001";
const now = new Date("2026-10-23T10:00:00Z");
const record = (over = {}) => ({
  id: ID,
  email: "nimal@test.lk",
  name: "Nimal Perera",
  image: null,
  role: "customer" as const,
  status: "active" as const,
  passwordHash: "$argon2id$real",
  lockedUntil: null as Date | null,
  tokenVersion: 3,
  emailVerified: true,
  ...over,
});
const input = { email: "nimal@test.lk", password: "correct horse" };
const ctx = { ip: "203.0.113.7", now };

beforeEach(() => {
  vi.clearAllMocks();
  pw.hashPassword.mockResolvedValue("$argon2id$dummy");
  sellers.findApprovedSellerIdByUserId.mockResolvedValue(null);
});

describe("signInWithPassword", () => {
  it("returns claims and clears failures on the right password", async () => {
    repo.findLoginRecordByEmail.mockResolvedValue(record());
    pw.verifyPassword.mockResolvedValue(true);

    const r = await signInWithPassword(input, ctx);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.claims).toMatchObject({ id: ID, role: "customer", tokenVersion: 3, checkedAt: now.getTime() });
    expect(r.claims.twoFactorVerified).toBe(false);
    expect(repo.recordSuccessfulLogin).toHaveBeenCalledWith(ID, now);
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "auth.login", ip: ctx.ip }));
  });

  it("unknown email fails the same way and still spends a hash verify (no timing leak)", async () => {
    repo.findLoginRecordByEmail.mockResolvedValue(null);
    pw.verifyPassword.mockResolvedValue(false);

    expect(await signInWithPassword(input, ctx)).toEqual({ ok: false });
    expect(pw.verifyPassword).toHaveBeenCalledWith("$argon2id$dummy", input.password);
    expect(repo.incrementFailedLogins).not.toHaveBeenCalled();
  });

  it("counts a wrong password and locks on the 5th", async () => {
    repo.findLoginRecordByEmail.mockResolvedValue(record());
    pw.verifyPassword.mockResolvedValue(false);

    repo.incrementFailedLogins.mockResolvedValue(4);
    expect(await signInWithPassword(input, ctx)).toEqual({ ok: false });
    expect(repo.lockUserUntil).not.toHaveBeenCalled();

    repo.incrementFailedLogins.mockResolvedValue(5);
    expect(await signInWithPassword(input, ctx)).toEqual({ ok: false });
    expect(repo.lockUserUntil).toHaveBeenCalledWith(ID, new Date(now.getTime() + 15 * 60 * 1000));
    expect(auditLog).toHaveBeenLastCalledWith(expect.objectContaining({ action: "auth.locked" }));
  });

  it("a locked account fails even with the right password, without checking the real hash", async () => {
    repo.findLoginRecordByEmail.mockResolvedValue(record({ lockedUntil: new Date(now.getTime() + 60_000) }));
    pw.verifyPassword.mockResolvedValue(true);

    expect(await signInWithPassword(input, ctx)).toEqual({ ok: false });
    expect(pw.verifyPassword).not.toHaveBeenCalledWith("$argon2id$real", expect.anything());
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.login_blocked", data: { reason: "locked" } }),
    );
  });

  it("suspended and Google-only accounts cannot use a password", async () => {
    pw.verifyPassword.mockResolvedValue(true);
    repo.findLoginRecordByEmail.mockResolvedValue(record({ status: "suspended" }));
    expect(await signInWithPassword(input, ctx)).toEqual({ ok: false });
    repo.findLoginRecordByEmail.mockResolvedValue(record({ passwordHash: null }));
    expect(await signInWithPassword(input, ctx)).toEqual({ ok: false });
  });

  it("puts the approved shop in seller claims, and never TOTP for a password login", async () => {
    pw.verifyPassword.mockResolvedValue(true);
    repo.findLoginRecordByEmail.mockResolvedValue(record({ role: "seller" }));
    sellers.findApprovedSellerIdByUserId.mockResolvedValue("64b0000000000000000000aa");
    const s = await signInWithPassword(input, ctx);
    expect(s.ok && s.claims.sellerId).toBe("64b0000000000000000000aa");

    repo.findLoginRecordByEmail.mockResolvedValue(record({ role: "admin" }));
    const a = await signInWithPassword(input, ctx);
    expect(a.ok && a.claims.twoFactorVerified).toBe(false);
  });
});

describe("refreshClaims (revocation every 5 min)", () => {
  const claims: TokenClaims = {
    id: ID,
    name: "Nimal Perera",
    email: "nimal@test.lk",
    image: null,
    role: "customer",
    sellerId: null,
    emailVerified: true,
    twoFactorVerified: false,
    tokenVersion: 3,
    checkedAt: now.getTime(),
  };
  const later = new Date(now.getTime() + 6 * 60 * 1000);

  it("does not hit the database before the re-check is due", async () => {
    expect(await refreshClaims(claims, new Date(now.getTime() + 60_000))).toBe(claims);
    expect(repo.findAuthState).not.toHaveBeenCalled();
  });

  it("signs out when tokenVersion was bumped, the user is suspended or gone", async () => {
    repo.findAuthState.mockResolvedValue({ ...record(), tokenVersion: 4 });
    expect(await refreshClaims(claims, later)).toBeNull();
    repo.findAuthState.mockResolvedValue({ ...record(), status: "suspended" });
    expect(await refreshClaims(claims, later)).toBeNull();
    repo.findAuthState.mockResolvedValue(null);
    expect(await refreshClaims(claims, later)).toBeNull();
  });

  it("picks up role and seller approval changes", async () => {
    repo.findAuthState.mockResolvedValue({ ...record(), role: "seller" });
    sellers.findApprovedSellerIdByUserId.mockResolvedValue("64b0000000000000000000aa");
    expect(await refreshClaims(claims, later)).toMatchObject({
      role: "seller",
      sellerId: "64b0000000000000000000aa",
      checkedAt: later.getTime(),
    });
  });
});

describe("signInWithGoogle", () => {
  const profile = {
    providerAccountId: "g-123",
    email: "nimal@test.lk",
    emailVerified: true,
    name: "Nimal",
    image: null,
  };

  it("refuses an unverified Google email (no account takeover by email)", async () => {
    expect(await signInWithGoogle({ ...profile, emailVerified: false }, ctx)).toBeNull();
    expect(accounts.linkAccount).not.toHaveBeenCalled();
  });

  it("links to the existing account with the same email", async () => {
    accounts.findUserIdByAccount.mockResolvedValue(null);
    repo.findLoginRecordByEmail.mockResolvedValue(record({ emailVerified: false }));
    repo.findAuthState.mockResolvedValue(record());

    const c = await signInWithGoogle(profile, ctx);

    expect(c?.id).toBe(ID);
    expect(accounts.linkAccount).toHaveBeenCalledWith(ID, "google", "g-123");
    expect(repo.markEmailVerified).toHaveBeenCalledWith(ID, now);
    expect(repo.createUser).not.toHaveBeenCalled();
  });

  it("creates a verified customer for a new email", async () => {
    accounts.findUserIdByAccount.mockResolvedValue(null);
    repo.findLoginRecordByEmail.mockResolvedValue(null);
    repo.createUser.mockResolvedValue(record());
    repo.findAuthState.mockResolvedValue(record());

    await signInWithGoogle(profile, ctx);

    expect(repo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "nimal@test.lk", passwordHash: null, emailVerified: now }),
    );
  });
});
