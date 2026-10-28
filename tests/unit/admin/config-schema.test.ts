import { describe, expect, it } from "vitest";
import { categorySchema, courierSchema, settingsSchema } from "@/modules/admin/config-schema";

describe("site settings form", () => {
  it("reads rupees and percent into cents and basis points", () => {
    const r = settingsSchema.parse({
      deliveryFee: "450",
      expressFee: "1,250.50",
      codEnabled: "on",
      platformFeePct: "2.5",
      autoCancelHours: "48",
    });
    expect(r).toEqual({
      deliveryFee: 45_000,
      expressFee: 125_050,
      codEnabled: true,
      platformFeePct: 250,
      autoCancelHours: 48,
    });
    expect(
      settingsSchema.parse({ deliveryFee: "0", expressFee: "0", platformFeePct: "0", autoCancelHours: "72" })
        .codEnabled,
    ).toBe(false);
  });
  it("refuses nonsense and limits", () => {
    const ok = { deliveryFee: "450", expressFee: "0", platformFeePct: "3", autoCancelHours: "48" };
    for (const bad of [
      { deliveryFee: "-1" },
      { platformFeePct: "31" },
      { platformFeePct: "3.333" },
      { deliveryFee: "20000" },
      { autoCancelHours: "6" },
      { autoCancelHours: "169" },
      { autoCancelHours: "36.5" },
      { autoCancelHours: "" },
    ]) {
      expect(settingsSchema.safeParse({ ...ok, ...bad }).success).toBe(false);
    }
  });
});

describe("courier form", () => {
  const base = {
    id: "",
    name: "Domex",
    codePattern: String.raw`^DX\d{9}$`,
    sampleCode: "dx123456789",
    trackingUrlTemplate: "https://www.domex.lk/track?waybill={code}",
  };
  it("checks the format against a real code", () => {
    expect(courierSchema.safeParse(base).success).toBe(true);
    const typo = courierSchema.safeParse({ ...base, sampleCode: "DX12345" });
    expect(typo.error?.issues[0]?.path).toEqual(["sampleCode"]);
  });
  it("refuses a broken pattern or a link without {code} / https", () => {
    expect(courierSchema.safeParse({ ...base, codePattern: String.raw`^DX(\d{9}$` }).success).toBe(false);
    expect(courierSchema.safeParse({ ...base, trackingUrlTemplate: "https://domex.lk/track" }).success).toBe(
      false,
    );
    expect(
      courierSchema.safeParse({ ...base, trackingUrlTemplate: "http://domex.lk/?c={code}" }).success,
    ).toBe(false);
  });
});

describe("category form", () => {
  const field = { key: "storage", label: "Storage", type: "select" as const, options: ["128GB", "256GB"] };
  const base = {
    id: "",
    name: "Tablets",
    icon: "phone",
    requiresSerial: true,
    isActive: true,
    sortOrder: "3",
  };
  it("accepts a template and normalises numbers", () => {
    const r = categorySchema.parse({
      ...base,
      specTemplate: [field, { key: "chip", label: "Chip", type: "text" }],
    });
    expect(r.sortOrder).toBe(3);
    expect(r.specTemplate[1]).toMatchObject({ unit: "", options: [], filterable: false });
  });
  it("needs unique keys, valid keys and 2+ choices for a list", () => {
    const dup = categorySchema.safeParse({ ...base, specTemplate: [field, field] });
    expect(dup.error?.issues.some((i) => i.path.join(".") === "specTemplate.1.key")).toBe(true);
    expect(
      categorySchema.safeParse({ ...base, specTemplate: [{ ...field, key: "Battery Life" }] }).success,
    ).toBe(false);
    expect(
      categorySchema.safeParse({ ...base, specTemplate: [{ ...field, options: ["one"] }] }).success,
    ).toBe(false);
  });
});
