import { describe, expect, it } from "vitest";
import { isCronRequest } from "@/lib/security/cron-auth";

describe("cron request check", () => {
  const secret = "a".repeat(64);
  it("accepts only the exact bearer secret", () => {
    expect(isCronRequest(`Bearer ${secret}`, secret)).toBe(true);
    expect(isCronRequest(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isCronRequest(secret, secret)).toBe(false);
    expect(isCronRequest(null, secret)).toBe(false);
  });
  it("refuses everything when no secret is configured", () => {
    expect(isCronRequest("Bearer ", undefined)).toBe(false);
    expect(isCronRequest("Bearer ", "")).toBe(false);
  });
});
