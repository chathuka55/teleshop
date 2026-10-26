/**
 * Security headers from docs/10-security.md §2. Pure functions so they can be unit tested
 * and reused by `middleware.ts` (per-request CSP nonce) and `next.config.ts` (static headers).
 */
import { BLOB_PUBLIC_HOST, MAP_TILE_HOST } from "../../config/storage";

export type CspOptions = { nonce: string; isDev: boolean };

export function buildCsp({ nonce, isDev }: CspOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next.js dev (React Refresh) needs eval; production never gets it. 'wasm-unsafe-eval' only allows
    // compiling WebAssembly (the meshopt GLB decoder), not JS eval.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "'wasm-unsafe-eval'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    // Three.js decodes textures through blob: URLs.
    // Product photos/avatars come from our public Upstash Blob bucket only (ADR-005).
    "img-src": ["'self'", "data:", "blob:", `https://${BLOB_PUBLIC_HOST}`, `https://${MAP_TILE_HOST}`],
    // GLTFLoader fetches textures embedded in .glb files through blob: URLs.
    "connect-src": ["'self'", "blob:", "https://*.upstash.io", ...(isDev ? ["ws:", "wss:"] : [])],
    "worker-src": ["'self'", "blob:"],
    "font-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** Headers that do not depend on the request. */
export const staticSecurityHeaders: ReadonlyArray<{ key: string; value: string }> = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

/** 16 random bytes, base64 — works in the Edge runtime (no Node `crypto`). */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
