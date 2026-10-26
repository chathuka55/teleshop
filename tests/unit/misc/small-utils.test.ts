import { beforeEach, describe, expect, it } from "vitest";
import { buildTrackingUrl, defaultCouriers } from "@/config/couriers";
import { memoryRateLimit as rateLimit, resetRateLimits } from "@/lib/security/rate-limit";
import { initials } from "@/lib/utils/strings";
import { newsletterSchema } from "@/modules/marketing/schema";

describe("buildTrackingUrl", () => {
  it("URL-encodes the code into the template", () => {
    expect(buildTrackingUrl("https://promptxpress.lk/track?code={code}", "PX-7731 2093 LK")).toBe(
      "https://promptxpress.lk/track?code=PX-7731%202093%20LK",
    );
  });

  it("cannot inject extra query params", () => {
    expect(buildTrackingUrl("https://x.lk/t?c={code}", "A&admin=1")).toBe("https://x.lk/t?c=A%26admin%3D1");
  });

  it("ships a valid regex for every default courier", () => {
    for (const c of defaultCouriers) expect(() => new RegExp(c.codePattern)).not.toThrow();
    const px = defaultCouriers.find((c) => c.name === "Prompt Xpress");
    expect(new RegExp(px?.codePattern ?? "").test("PX-7731 2093 LK")).toBe(true);
  });
});

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit then blocks with Retry-After", async () => {
    const opts = { limit: 2, windowMs: 60_000 };
    expect(rateLimit("k", opts, 0).ok).toBe(true);
    expect(rateLimit("k", opts, 1).ok).toBe(true);
    const blocked = rateLimit("k", opts, 2);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("resets after the window", async () => {
    const opts = { limit: 1, windowMs: 1000 };
    rateLimit("w", opts, 0);
    expect(rateLimit("w", opts, 500).ok).toBe(false);
    expect(rateLimit("w", opts, 1001).ok).toBe(true);
  });
});

describe("initials", () => {
  it.each([
    ["Chathuka Jayasekara", "CJ"],
    ["iStore", "I"],
    ["  pc   forge  lk ", "PF"],
  ])("%s → %s", (name, expected) => expect(initials(name)).toBe(expected));
});

describe("newsletterSchema", () => {
  it("normalises the email", () => {
    expect(newsletterSchema.parse({ email: "  Me@Example.COM " }).email).toBe("me@example.com");
  });

  it("rejects junk", () => {
    expect(newsletterSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(newsletterSchema.safeParse({ email: { $gt: "" } }).success).toBe(false);
  });
});

describe("formatPhoneLK", () => {
  it("shows Sri Lankan numbers in local format", async () => {
    const { formatPhoneLK } = await import("@/lib/utils/strings");
    expect(formatPhoneLK("+94771234567")).toBe("077 123 4567");
    expect(formatPhoneLK("+94112345678")).toBe("011 234 5678");
    expect(formatPhoneLK("+1 555")).toBe("+1 555");
  });
});
