import type { SessionUser } from "./claims";

/**
 * Route guard rules for /account, /checkout, /seller and /admin (docs/10 §1). Pure and edge-safe:
 * middleware.ts applies them on every request, unit tests pin them down. Services repeat the
 * role check with requireRole() — middleware alone is never the only gate.
 */
export type Access = { allow: true } | { allow: false; redirectTo: string };

export const SIGN_IN_PATH = "/sign-in";
export const ADMIN_LOGIN_PATH = "/admin/login";

const ALLOW: Access = { allow: true };

/** True when `pathname` is `base` or below it, by whole path segments ("/sellers" ≠ "/seller"). */
export function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function signInRedirect(pathname: string, search: string, loginPath = SIGN_IN_PATH): Access {
  const next = encodeURIComponent(`${pathname}${search}`);
  return { allow: false, redirectTo: `${loginPath}?next=${next}` };
}

export function routeAccess(pathname: string, user: SessionUser | null, search = ""): Access {
  if (isUnder(pathname, "/admin")) {
    // The admin login page itself must stay reachable.
    if (isUnder(pathname, ADMIN_LOGIN_PATH)) return ALLOW;
    if (!user) return signInRedirect(pathname, search, ADMIN_LOGIN_PATH);
    if (user.role !== "admin") return { allow: false, redirectTo: "/" };
    if (!user.twoFactorVerified) return signInRedirect(pathname, search, ADMIN_LOGIN_PATH);
    return ALLOW;
  }
  if (isUnder(pathname, "/seller")) {
    if (!user) return signInRedirect(pathname, search);
    if (user.role === "seller" && user.sellerId) return ALLOW;
    // Customers (and sellers still waiting for approval) go to the seller application.
    return { allow: false, redirectTo: user.role === "admin" ? "/admin" : "/register/seller" };
  }
  // Checkout is guarded here (an HTTP redirect) rather than by the page alone: a page-level
  // redirect followed by the sign-in redirect back confuses the client router.
  if (isUnder(pathname, "/account") || isUnder(pathname, "/checkout")) {
    return user ? ALLOW : signInRedirect(pathname, search);
  }
  return ALLOW;
}

/**
 * Only same-site relative paths are accepted as a post-login `next` (no open redirects:
 * "//evil.com", "https://…" and backslash tricks fall back to "/").
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
