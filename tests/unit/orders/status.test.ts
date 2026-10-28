import { describe, expect, it } from "vitest";
import { publicReviewerName } from "@/lib/utils/strings";
import { cancelOrderSchema } from "@/modules/orders/schema";
import { canCustomerCancel, deriveOrderStatus, filterOrders, parseOrderTab } from "@/modules/orders/status";
import { createReviewSchema, stripControlChars } from "@/modules/reviews/schema";

describe("deriveOrderStatus", () => {
  it.each([
    [["pending", "pending"], "pending"],
    [["pending", "confirmed"], "in_progress"],
    [["ready_to_ship", "processing"], "in_progress"],
    [["shipped", "processing"], "in_progress"],
    [["shipped", "shipped"], "shipped"],
    [["delivered", "shipped"], "partially_delivered"],
    [["delivered", "delivered"], "delivered"],
    [["delivered", "cancelled"], "delivered"],
    [["cancelled", "cancelled"], "cancelled"],
    [["returned"], "cancelled"],
  ] as const)("%j → %s", (statuses, expected) => expect(deriveOrderStatus(statuses)).toBe(expected));
});

describe("canCustomerCancel (before shipped)", () => {
  it("allows every pre-courier status", () => {
    expect(canCustomerCancel(["pending", "confirmed", "processing", "ready_to_ship"])).toBe(true);
    expect(canCustomerCancel(["cancelled", "pending"])).toBe(true);
  });
  it("refuses once any package is with the courier or done", () => {
    expect(canCustomerCancel(["pending", "shipped"])).toBe(false);
    expect(canCustomerCancel(["delivered"])).toBe(false);
    expect(canCustomerCancel(["cancelled"])).toBe(false);
  });
});

describe("My Orders tabs + search", () => {
  const orders = [
    { orderNo: "TS-2026-000001", status: "pending" as const, itemNames: ["Apple iPhone 17 Pro"] },
    { orderNo: "TS-2026-000002", status: "delivered" as const, itemNames: ["AMD Ryzen 7 9800X3D"] },
    { orderNo: "TS-2026-000003", status: "cancelled" as const, itemNames: ["Sony WH-1000XM6"] },
    { orderNo: "TS-2026-000004", status: "partially_delivered" as const, itemNames: ["iPhone case"] },
  ];
  const nos = (r: { orderNo: string }[]) => r.map((o) => o.orderNo.slice(-1));

  it("filters by tab", () => {
    expect(nos(filterOrders(orders, "all", ""))).toEqual(["1", "2", "3", "4"]);
    expect(nos(filterOrders(orders, "active", ""))).toEqual(["1", "4"]);
    expect(nos(filterOrders(orders, "delivered", ""))).toEqual(["2"]);
    expect(nos(filterOrders(orders, "cancelled", ""))).toEqual(["3"]);
  });
  it("searches order numbers and product names, case-insensitively", () => {
    expect(nos(filterOrders(orders, "all", "iphone"))).toEqual(["1", "4"]);
    expect(nos(filterOrders(orders, "all", "ts-2026-000002"))).toEqual(["2"]);
    expect(nos(filterOrders(orders, "active", "ryzen"))).toEqual([]);
  });
  it("falls back to All for unknown tabs", () => {
    expect(parseOrderTab("delivered")).toBe("delivered");
    expect(parseOrderTab("constructor")).toBe("all");
    expect(parseOrderTab(undefined)).toBe("all");
  });
});

describe("cancelOrderSchema", () => {
  it("needs a known reason", () => {
    expect(cancelOrderSchema.safeParse({ orderNo: "TS-2026-000001", reason: "changed_mind" }).success).toBe(
      true,
    );
    expect(cancelOrderSchema.safeParse({ orderNo: "TS-2026-000001", reason: "hack" }).success).toBe(false);
    expect(cancelOrderSchema.safeParse({ orderNo: "TS-2026-000001" }).success).toBe(false);
  });
});

describe("reviews", () => {
  const base = { orderNo: "TS-2026-000001", itemId: "a".repeat(24) };

  it("parses a form post (rating as text) and strips control characters", () => {
    const r = createReviewSchema.parse({
      ...base,
      rating: "4",
      title: " Great\u0000 ",
      comment: "Line 1\nLine 2\u0007",
    });
    expect(r).toMatchObject({ rating: 4, title: "Great", comment: "Line 1\nLine 2" });
  });
  it("requires a 1–5 star rating", () => {
    for (const rating of [undefined, "", "0", "6", "3.5"]) {
      const r = createReviewSchema.safeParse({ ...base, rating });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe("Choose a star rating");
    }
  });
  it("keeps tabs and new lines", () => expect(stripControlChars("a\tb\nc\u001bd")).toBe("a\tb\ncd"));
  it("shows first name + initial only", () => {
    expect(publicReviewerName("Nimal Perera")).toBe("Nimal P.");
    expect(publicReviewerName("  chathuka  de  silva ")).toBe("chathuka S.");
    expect(publicReviewerName("Madonna")).toBe("Madonna");
    expect(publicReviewerName("   ")).toBe("Teleshop customer");
  });
});
