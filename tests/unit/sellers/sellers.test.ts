import { describe, expect, it } from "vitest";
import {
  colomboMonthStart,
  deliveredEarnings,
  inProgressValue,
  liveOrders,
  platformFee,
} from "@/modules/sellers/access";
import { shopSettingsSchema } from "@/modules/sellers/schema";
import type { PackageStatus } from "@/modules/orders/types";

const totals = (over: Partial<Record<PackageStatus, [number, number, number]>>) =>
  Object.fromEntries(
    (
      [
        "pending",
        "confirmed",
        "processing",
        "ready_to_ship",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ] as const
    ).map((s) => {
      const [packages, itemsCents, deliveryCents] = over[s] ?? [0, 0, 0];
      return [s, { packages, itemsCents, deliveryCents }];
    }),
  ) as Record<PackageStatus, { packages: number; itemsCents: number; deliveryCents: number }>;

describe("seller money", () => {
  it("charges the fee on item value only, rounded to the cent", () => {
    expect(platformFee(38_990_000, 300)).toBe(1_169_700);
    expect(platformFee(333, 300)).toBe(10);
  });
  it("earns from delivered packages only", () => {
    const t = totals({
      delivered: [2, 50_000_000, 90_000],
      shipped: [1, 10_000_000, 45_000],
      cancelled: [1, 9_000_000, 0],
    });
    expect(deliveredEarnings(t, 300)).toEqual({
      deliveredPackages: 2,
      grossCents: 50_090_000,
      feeCents: 1_500_000,
      netCents: 48_590_000,
    });
    expect(inProgressValue(t)).toBe(10_045_000);
    expect(liveOrders(t)).toEqual({ count: 3, valueCents: 60_135_000 });
  });
  it("starts the month at midnight Sri Lanka time", () => {
    // 1 Nov 00:30 in Colombo is still 31 Oct in UTC.
    expect(colomboMonthStart(new Date("2026-10-31T19:00:00Z")).toISOString()).toBe(
      "2026-10-31T18:30:00.000Z",
    );
    expect(colomboMonthStart(new Date("2026-10-31T18:00:00Z")).toISOString()).toBe(
      "2026-09-30T18:30:00.000Z",
    );
  });
});

describe("shop settings form", () => {
  const base = {
    description: "Authorised Apple reseller.",
    openingHours: "Mon–Sat 9–7",
    phone: "081 222 3344",
    addressLine1: "12 Temple Road",
    city: "Kandy",
    district: "Kandy",
    postalCode: "",
    tags: "Phones, Apple ,  Repairs",
    dispatchDays: "2",
    payoutBank: "",
    payoutBranch: "",
    payoutLast4: "",
  };
  it("normalises phone and tags", () => {
    const r = shopSettingsSchema.parse(base);
    expect(r.phone).toBe("+94812223344");
    expect(r.tags).toEqual(["Phones", "Apple", "Repairs"]);
    expect(r.dispatchDays).toBe(2);
  });
  it("limits tags", () => {
    expect(shopSettingsSchema.safeParse({ ...base, tags: "a,b,c,d,e,f" }).success).toBe(false);
    expect(shopSettingsSchema.safeParse({ ...base, tags: "Apple, apple" }).success).toBe(false);
  });
  it("needs all bank details or none, and only the last 4 digits", () => {
    const partial = shopSettingsSchema.safeParse({ ...base, payoutBank: "BOC" });
    expect(partial.error?.issues.map((i) => i.path[0])).toEqual(["payoutBranch", "payoutLast4"]);
    expect(
      shopSettingsSchema.safeParse({
        ...base,
        payoutBank: "BOC",
        payoutBranch: "Kandy",
        payoutLast4: "123456",
      }).success,
    ).toBe(false);
    expect(
      shopSettingsSchema.safeParse({ ...base, payoutBank: "BOC", payoutBranch: "Kandy", payoutLast4: "3456" })
        .success,
    ).toBe(true);
  });
});
