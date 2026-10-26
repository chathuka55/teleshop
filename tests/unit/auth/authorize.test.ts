import { describe, expect, it } from "vitest";
import {
  AuthorizationError,
  assertEmailVerified,
  assertOwnsUserResource,
  assertRole,
  assertSellerOwns,
} from "@/lib/auth/authorize";
import type { SessionUser } from "@/lib/auth/claims";
import { isLocked, lockAfterFailure, MAX_FAILED_LOGINS, LOCK_MS } from "@/modules/auth/access";

const user = (over: Partial<SessionUser> = {}): SessionUser => ({
  id: "64b000000000000000000001",
  name: "A",
  email: "a@test.lk",
  image: null,
  role: "customer",
  sellerId: null,
  emailVerified: true,
  twoFactorVerified: false,
  ...over,
});

const code = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return e instanceof AuthorizationError ? e.code : "OTHER";
  }
  return undefined;
};

describe("assertRole (requireRole)", () => {
  it("rejects guests and wrong roles", () => {
    expect(code(() => assertRole(null, ["customer"]))).toBe("UNAUTHENTICATED");
    expect(code(() => assertRole(user(), ["seller"]))).toBe("FORBIDDEN");
    expect(code(() => assertRole(user({ role: "seller", sellerId: "s1" }), ["admin"]))).toBe("FORBIDDEN");
  });

  it("admins need TOTP, sellers need an approved shop", () => {
    expect(code(() => assertRole(user({ role: "admin" }), ["admin"]))).toBe("FORBIDDEN");
    expect(code(() => assertRole(user({ role: "seller" }), ["seller"]))).toBe("FORBIDDEN");
    expect(assertRole(user({ role: "admin", twoFactorVerified: true }), ["admin"]).role).toBe("admin");
    expect(assertRole(user({ role: "seller", sellerId: "s1" }), ["seller"]).sellerId).toBe("s1");
  });
});

describe("ownership", () => {
  it("seller A cannot touch seller B's product", () => {
    const sellerA = user({ role: "seller", sellerId: "shopA" });
    expect(code(() => assertSellerOwns(sellerA, "shopB"))).toBe("FORBIDDEN");
    expect(code(() => assertSellerOwns(sellerA, "shopA"))).toBeUndefined();
  });

  it("customers cannot act on a seller's resources; verified admins can", () => {
    expect(code(() => assertSellerOwns(user(), "shopA"))).toBe("FORBIDDEN");
    expect(code(() => assertSellerOwns(user({ role: "admin" }), "shopA"))).toBe("FORBIDDEN");
    expect(
      code(() => assertSellerOwns(user({ role: "admin", twoFactorVerified: true }), "shopA")),
    ).toBeUndefined();
  });

  it("users only reach their own records", () => {
    expect(code(() => assertOwnsUserResource(user(), "64b000000000000000000002"))).toBe("FORBIDDEN");
    expect(code(() => assertOwnsUserResource(user(), "64b000000000000000000001"))).toBeUndefined();
  });

  it("checkout needs a verified email", () => {
    expect(code(() => assertEmailVerified(user({ emailVerified: false })))).toBe("EMAIL_UNVERIFIED");
  });
});

describe("lockout policy", () => {
  const now = new Date("2026-10-23T10:00:00Z");

  it(`locks for 15 minutes on the ${MAX_FAILED_LOGINS}th failure`, () => {
    expect(lockAfterFailure(MAX_FAILED_LOGINS - 1, now)).toBeNull();
    expect(lockAfterFailure(MAX_FAILED_LOGINS, now)?.getTime()).toBe(now.getTime() + LOCK_MS);
  });

  it("a lock expires", () => {
    expect(isLocked(new Date(now.getTime() + 1000), now)).toBe(true);
    expect(isLocked(new Date(now.getTime() - 1000), now)).toBe(false);
    expect(isLocked(null, now)).toBe(false);
  });
});
