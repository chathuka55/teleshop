import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/lib/auth/claims";
import { routeAccess, safeNextPath } from "@/lib/auth/route-access";

const base: SessionUser = {
  id: "64b000000000000000000001",
  name: "Test User",
  email: "user@test.lk",
  image: null,
  role: "customer",
  sellerId: null,
  emailVerified: true,
  twoFactorVerified: false,
};
const customer = base;
const seller: SessionUser = { ...base, role: "seller", sellerId: "64b0000000000000000000aa" };
const pendingSeller: SessionUser = { ...base, role: "seller", sellerId: null };
const admin2fa: SessionUser = { ...base, role: "admin", twoFactorVerified: true };
const adminNo2fa: SessionUser = { ...base, role: "admin" };

const go = (path: string, user: SessionUser | null) => routeAccess(path, user);

describe("routeAccess — guards (P2-T04)", () => {
  it("customer cannot reach /seller", () => {
    expect(go("/seller", customer)).toEqual({ allow: false, redirectTo: "/register/seller" });
    expect(go("/seller/products", customer)).toEqual({ allow: false, redirectTo: "/register/seller" });
  });

  it("seller cannot reach /admin", () => {
    expect(go("/admin", seller)).toEqual({ allow: false, redirectTo: "/" });
    expect(go("/admin/orders/123", seller)).toEqual({ allow: false, redirectTo: "/" });
  });

  it("customer cannot reach /admin", () => {
    expect(go("/admin", customer)).toEqual({ allow: false, redirectTo: "/" });
  });

  it("approved seller reaches /seller; a seller awaiting approval does not", () => {
    expect(go("/seller/orders", seller)).toEqual({ allow: true });
    expect(go("/seller", pendingSeller)).toEqual({ allow: false, redirectTo: "/register/seller" });
  });

  it("admin needs TOTP before /admin opens", () => {
    expect(go("/admin", adminNo2fa)).toEqual({ allow: false, redirectTo: "/admin/login?next=%2Fadmin" });
    expect(go("/admin/orders", admin2fa)).toEqual({ allow: true });
  });

  it("guests are sent to sign in with a return path", () => {
    expect(go("/account/orders", null)).toEqual({
      allow: false,
      redirectTo: "/sign-in?next=%2Faccount%2Forders",
    });
    expect(routeAccess("/account", null, "?tab=open")).toEqual({
      allow: false,
      redirectTo: "/sign-in?next=%2Faccount%3Ftab%3Dopen",
    });
    expect(go("/seller", null)).toEqual({ allow: false, redirectTo: "/sign-in?next=%2Fseller" });
    expect(go("/admin", null)).toEqual({ allow: false, redirectTo: "/admin/login?next=%2Fadmin" });
  });

  it("any signed-in user reaches /account", () => {
    for (const u of [customer, seller, pendingSeller, admin2fa])
      expect(go("/account", u)).toEqual({ allow: true });
  });

  it("leaves public pages alone and matches whole segments only", () => {
    for (const path of [
      "/",
      "/shop",
      "/sellers",
      "/s/techzone",
      "/register/seller",
      "/accounts",
      "/administrator",
    ]) {
      expect(go(path, null)).toEqual({ allow: true });
    }
    expect(go("/admin/login", null)).toEqual({ allow: true });
  });
});

describe("safeNextPath — no open redirects", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/account/orders?tab=open")).toBe("/account/orders?tab=open");
  });

  it("rejects absolute, protocol-relative and backslash URLs", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "evil.com", "", null, undefined]) {
      expect(safeNextPath(bad)).toBe("/");
    }
  });
});
