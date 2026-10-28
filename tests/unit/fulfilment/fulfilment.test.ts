import { describe, expect, it } from "vitest";
import { luhnValid, serialNumber } from "@/lib/validation/serial";
import {
  canRecordSerials,
  canSeeFullAddress,
  canSellerStep,
  missingSerials,
} from "@/modules/fulfilment/access";
import { recordSerialsSchema, sellerStepSchema } from "@/modules/fulfilment/schema";
import { countByTab, inSellerTab, parseSellerOrderTab } from "@/modules/fulfilment/tabs";

describe("IMEI / serial validation", () => {
  it("checks the IMEI Luhn digit", () => {
    expect(luhnValid("356938035643809")).toBe(true);
    expect(luhnValid("490154203237518")).toBe(true);
    expect(luhnValid("356938035643808")).toBe(false);
    expect(luhnValid("abc")).toBe(false);
  });
  it("normalises spaces, dashes and case", () => {
    expect(serialNumber.parse("35-693803-564380-9")).toBe("356938035643809");
    expect(serialNumber.parse(" c02xk1abjg5h ")).toBe("C02XK1ABJG5H");
  });
  it.each([
    ["356938035643808", "last digit"],
    ["12345", "6–30"],
    ["ABC/123456", "6–30"],
    ["", "Enter"],
  ])("rejects %s", (input, msg) => {
    const r = serialNumber.safeParse(input);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain(msg);
  });
  it("needs one different number per unit", () => {
    const base = { orderNo: "TS-2026-000001", itemId: "a".repeat(24) };
    expect(recordSerialsSchema.safeParse({ ...base, serials: ["SN123456", "SN123457"] }).success).toBe(true);
    const dup = recordSerialsSchema.safeParse({ ...base, serials: ["SN123456", "sn-123456"] });
    expect(dup.error?.issues[0]?.message).toBe("Each unit needs a different number");
    expect(recordSerialsSchema.safeParse({ ...base, serials: [] }).success).toBe(false);
  });
});

describe("seller steps (order lifecycle)", () => {
  it("only moves forward one step at a time", () => {
    expect(canSellerStep("accept", "pending")).toBe(true);
    expect(canSellerStep("pack", "pending")).toBe(false);
    expect(canSellerStep("pack", "confirmed")).toBe(true);
    expect(canSellerStep("ready", "confirmed")).toBe(false);
    expect(canSellerStep("ready", "processing")).toBe(true);
    expect(canSellerStep("accept", "confirmed")).toBe(false);
  });
  it("can cancel until ready to ship, never after", () => {
    for (const s of ["pending", "confirmed", "processing"] as const)
      expect(canSellerStep("cancel", s)).toBe(true);
    for (const s of ["ready_to_ship", "shipped", "delivered", "cancelled"] as const) {
      expect(canSellerStep("cancel", s)).toBe(false);
    }
  });
  it("records serials only between accepting and ready", () => {
    expect(canRecordSerials("pending")).toBe(false);
    expect(canRecordSerials("confirmed")).toBe(true);
    expect(canRecordSerials("processing")).toBe(true);
    expect(canRecordSerials("ready_to_ship")).toBe(false);
  });
  it("counts missing serials for serial-tracked items only", () => {
    expect(
      missingSerials([
        { qty: 2, requiresSerial: true, serialNumbers: ["A"] },
        { qty: 3, requiresSerial: false, serialNumbers: [] },
        { qty: 1, requiresSerial: true, serialNumbers: ["B"] },
      ]),
    ).toBe(1);
  });
  it("hides the customer's address until the shop accepts", () => {
    expect(canSeeFullAddress("pending")).toBe(false);
    expect(canSeeFullAddress("cancelled")).toBe(false);
    expect(canSeeFullAddress("confirmed")).toBe(true);
  });
  it("needs a reason to cancel", () => {
    expect(sellerStepSchema.safeParse({ orderNo: "TS-2026-000001", step: "cancel" }).success).toBe(false);
    expect(
      sellerStepSchema.safeParse({ orderNo: "TS-2026-000001", step: "cancel", reason: "out_of_stock" })
        .success,
    ).toBe(true);
    expect(sellerStepSchema.safeParse({ orderNo: "TS-2026-000001", step: "ship" }).success).toBe(false);
  });
});

describe("seller order tabs", () => {
  it("groups statuses and counts them", () => {
    const counts = countByTab([
      { status: "pending" },
      { status: "pending" },
      { status: "confirmed" },
      { status: "processing" },
      { status: "returned" },
    ]);
    expect(counts).toMatchObject({ new: 2, packing: 2, ready: 0, cancelled: 1, all: 5 });
    expect(inSellerTab("packing", "processing")).toBe(true);
    expect(parseSellerOrderTab("__proto__")).toBe("new");
    expect(parseSellerOrderTab("ready")).toBe("ready");
  });
});
