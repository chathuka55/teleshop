import { describe, expect, it } from "vitest";
import { orderNo, phoneLK } from "@/lib/validation/common";

describe("phoneLK", () => {
  it.each([
    ["0771234567", "+94771234567"],
    ["077 123 4567", "+94771234567"],
    ["+94 77 123 4567", "+94771234567"],
    ["94771234567", "+94771234567"],
    ["(077) 123-4567", "+94771234567"],
  ])("%s → %s", (input, expected) => expect(phoneLK.parse(input)).toBe(expected));

  it.each(["0112345678", "12345", "+1 555 123 4567", "07712345678", ""])("rejects %s", (input) => {
    expect(phoneLK.safeParse(input).success).toBe(false);
  });
});

describe("orderNo", () => {
  it("normalises case", () => expect(orderNo.parse(" ts-2026-000123 ")).toBe("TS-2026-000123"));
  it("rejects other formats", () => {
    expect(orderNo.safeParse("TS-26-123").success).toBe(false);
    expect(orderNo.safeParse({ $gt: "" }).success).toBe(false);
  });
});
