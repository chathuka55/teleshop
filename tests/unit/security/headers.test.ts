import { describe, expect, it } from "vitest";
import { buildCsp, createNonce, staticSecurityHeaders } from "@/lib/security/headers";

describe("buildCsp (P0-T04)", () => {
  it("uses the nonce and strict-dynamic, without unsafe-eval in production", () => {
    const csp = buildCsp({ nonce: "abc123", isDev: false });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("'unsafe-eval'");
    // WebAssembly only (meshopt decoder for the hero GLBs) — not JS eval.
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("allows blob: for Three.js textures and workers", () => {
    const csp = buildCsp({ nonce: "n", isDev: false });
    expect(csp).toMatch(/img-src [^;]*blob:/);
    // Only our bucket — a wildcard would let any Upstash bucket serve images here.
    expect(csp).toMatch(/img-src [^;]*https:\/\/b65e2efccddc\.blob\.upstash\.io/);
    expect(csp).not.toMatch(/\*\.blob\.upstash\.io/);
    expect(csp).toMatch(/worker-src [^;]*blob:/);
    // GLTFLoader fetch()es embedded GLB textures via blob: URLs.
    expect(csp).toMatch(/connect-src [^;]*blob:/);
  });

  it("only relaxes eval and websockets in development", () => {
    const csp = buildCsp({ nonce: "n", isDev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toMatch(/connect-src [^;]*ws:/);
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("staticSecurityHeaders", () => {
  it("includes the headers from docs/10 §2", () => {
    const keys = staticSecurityHeaders.map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Cross-Origin-Opener-Policy",
      ]),
    );
  });
});

describe("createNonce", () => {
  it("returns a fresh base64 value each time", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(Buffer.from(a, "base64")).toHaveLength(16);
  });
});
