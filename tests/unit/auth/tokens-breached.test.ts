import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { isBreachedPassword } from "@/lib/auth/breached";
import { hashToken, looksLikeToken, newToken } from "@/lib/auth/tokens";

describe("email-link tokens", () => {
  it("are 32 random bytes in base64url, stored only as SHA-256", () => {
    const a = newToken();
    const b = newToken();
    expect(looksLikeToken(a.token)).toBe(true);
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(hashToken(a.token));
    expect(a.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(a.hash).not.toContain(a.token);
  });

  it("rejects anything that isn't token-shaped before a database lookup", () => {
    for (const bad of [undefined, "", "short", { $ne: null }, "x".repeat(43) + "!", 42]) {
      expect(looksLikeToken(bad)).toBe(false);
    }
  });
});

describe("isBreachedPassword (HIBP k-anonymity)", () => {
  const sha1 = (s: string): string => createHash("sha1").update(s).digest("hex").toUpperCase();
  const respond = (body: string, ok = true) =>
    vi.fn(async () => ({ ok, text: async () => body }) as Response);

  it("sends only the 5-char hash prefix", async () => {
    const fetchMock = respond("");
    await isBreachedPassword("password123456", fetchMock);
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${sha1("password123456").slice(0, 5)}`);
    // Only the 5-char prefix travels — neither the password nor the full hash.
    const path = url.split("/range/")[1] ?? "";
    expect(path).toHaveLength(5);
    expect(path).not.toContain("123456");
  });

  it("matches the suffix with a non-zero count (padding rows have count 0)", async () => {
    const suffix = sha1("password123456").slice(5);
    expect(await isBreachedPassword("password123456", respond(`AAAA:3\r\n${suffix}:42\r\n`))).toBe(true);
    expect(await isBreachedPassword("password123456", respond(`${suffix}:0`))).toBe(false);
    expect(await isBreachedPassword("password123456", respond("AAAA:3"))).toBe(false);
  });

  it("fails open when the API is down", async () => {
    expect(await isBreachedPassword("x".repeat(12), respond("", false))).toBe(false);
    const boom = vi.fn(async () => {
      throw new Error("network");
    });
    expect(await isBreachedPassword("x".repeat(12), boom as unknown as typeof fetch)).toBe(false);
  });
});
