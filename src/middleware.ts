import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";
import { parseSessionUser } from "@/lib/auth/claims";
import { routeAccess } from "@/lib/auth/route-access";
import { buildCsp, createNonce } from "@/lib/security/headers";

const { auth } = NextAuth(authConfig);

/**
 * Runs on every page request:
 *  1. Route guards for /account, /seller and /admin (src/lib/auth/route-access.ts). Services
 *     check the role again with requireRole() — this is the first gate, not the only one.
 *  2. Generates a CSP nonce and passes it to Next (via the request CSP header) so its inline
 *     scripts are allowed, and to our layout via `x-nonce`.
 *  3. Sets the CSP response header. Static headers (HSTS, nosniff…) come from next.config.ts.
 */
export const middleware = auth((request) => {
  const { pathname, search } = request.nextUrl;
  const access = routeAccess(pathname, parseSessionUser(request.auth?.user), search);

  const nonce = createNonce();
  const csp = buildCsp({ nonce, isDev: process.env.NODE_ENV !== "production" });

  if (!access.allow) {
    const response = NextResponse.redirect(new URL(access.redirectTo, request.nextUrl.origin));
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  matcher: [
    {
      // Skip static files, images, 3D models and prefetches.
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|models/|images/|draco/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
