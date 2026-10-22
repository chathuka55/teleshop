import { describe, expect, it } from "vitest";
import { discountPercent, formatLKR, lkrToCents, sumCents } from "@/lib/utils/money";

describe("formatLKR", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatLKR(38_990_000)).toBe("LKR 389,900");
  });

  it("shows cents when the amount has them", () => {
    expect(formatLKR(12_345)).toBe("LKR 123.45");
  });

  it("can force two decimals and drop the prefix", () => {
    expect(formatLKR(45_000, { cents: true, prefix: false })).toBe("450.00");
  });

  it("formats zero", () => {
    expect(formatLKR(0)).toBe("LKR 0");
  });

  it("rejects floats — money must be integer cents", () => {
    expect(() => formatLKR(10.5)).toThrow(TypeError);
  });
});

describe("lkrToCents", () => {
  it.each([
    ["389900", 38_990_000],
    ["389,900", 38_990_000],
    ["123.4", 12_340],
    ["123.45", 12_345],
    [450, 45_000],
  ] as const)("%s → %i cents", (input, cents) => {
    expect(lkrToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "1.234", "-5", "1e5"])("rejects %s", (input) => {
    expect(() => lkrToCents(input)).toThrow(TypeError);
  });
});

describe("discountPercent", () => {
  it("rounds to a whole percent", () => {
    expect(discountPercent(38_990_000, 41_990_000)).toBe(7);
  });

  it("is 0 without a higher compare-at price", () => {
    expect(discountPercent(1000, null)).toBe(0);
    expect(discountPercent(1000, 900)).toBe(0);
  });
});

describe("sumCents", () => {
  it("adds integer cents exactly", () => {
    expect(sumCents([10, 20, 30])).toBe(60);
  });

  it("rejects a float line", () => {
    expect(() => sumCents([10, 0.1])).toThrow(TypeError);
  });
});
