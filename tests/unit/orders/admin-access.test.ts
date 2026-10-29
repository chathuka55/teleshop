import { describe, expect, it } from "vitest";
import { validHandOver } from "@/modules/orders/admin-access";

describe("courier hand-over time", () => {
  const placedAt = new Date("2026-10-29T05:01:40Z");
  const now = new Date("2026-10-29T08:00:00Z");

  it("accepts the minute the order was placed (the form has no seconds)", () => {
    expect(validHandOver(new Date("2026-10-29T05:01:00Z"), placedAt, now)).toBe(true);
  });
  it("refuses a time before that minute, and more than 10 minutes in the future", () => {
    expect(validHandOver(new Date("2026-10-29T05:00:59Z"), placedAt, now)).toBe(false);
    expect(validHandOver(new Date("2026-10-29T08:10:00Z"), placedAt, now)).toBe(true);
    expect(validHandOver(new Date("2026-10-29T08:10:01Z"), placedAt, now)).toBe(false);
  });
});
