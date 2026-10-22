import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/security/headers";

/**
 * Runs on every page request:
 *  1. Generates a CSP nonce and passes it to Next (via the request CSP header) so its
 *     inline scripts are allowed, and to our layout via `x-nonce`.
 *  2. Sets the CSP response header. Static headers (HSTS, nosniff…) come from next.config.ts.
 *
 * Route guards for /account, /seller and /admin are added in P2-T04.
 */
export function middleware(request: NextRequest): NextResponse {
  const nonce = createNonce();
  const csp = buildCsp({ nonce, isDev: process.env.NODE_ENV !== "production" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

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
