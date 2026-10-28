import { beforeAll, describe, expect, it } from "vitest";
import {
  AuditLogModel,
  BrandModel,
  CategoryModel,
  CourierModel,
  InventoryModel,
  UserModel,
} from "@/db/models";
import { getSettings } from "@/db/repositories/settings.repository";
import type { SessionUser } from "@/lib/auth/claims";
import {
  getReportFor,
  listLowStockFor,
  saveBrandFor,
  saveCategoryFor,
  saveCourierFor,
  saveSettingsFor,
} from "@/modules/admin/config";
import { getCheckoutOptions } from "@/modules/cart/service";
import { seedDatabase } from "../../../scripts/seed/seed-db";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_admin_config");

const ctx = { ip: "203.0.113.95" };
let admin: SessionUser;

beforeAll(async () => {
  await seedDatabase({ fixedPassword: "test-password-123" });
  const u = await UserModel.create({
    email: "ops5@test.lk",
    name: "Ops",
    role: "admin",
    emailVerified: new Date(),
  });
  admin = {
    id: String(u._id),
    name: u.name,
    email: u.email,
    image: null,
    role: "admin",
    sellerId: null,
    emailVerified: true,
    twoFactorVerified: true,
  };
}, 120_000);

describe("admin configuration (P7-T03/T05)", () => {
  it("settings: checkout uses the new fees and COD switch; changes are audit-logged", async () => {
    const r = await saveSettingsFor(
      admin,
      { deliveryFee: 50_000, expressFee: 100_000, codEnabled: false, platformFeePct: 250 },
      ctx,
    );
    expect(r.ok && r.message).toMatch(/OFF/);
    expect(await getCheckoutOptions()).toMatchObject({
      fees: { standard: 50_000, express: 100_000 },
      codEnabled: false,
    });
    expect((await getSettings()).platformFeeBp).toBe(250);
    const log = await AuditLogModel.findOne({ action: "settings.updated" }).lean();
    expect(log?.data).toMatchObject({ codEnabled: { from: true, to: false } });
    // An admin who hasn't passed TOTP is refused.
    await expect(
      saveSettingsFor(
        { ...admin, twoFactorVerified: false },
        { deliveryFee: 0, expressFee: 0, codEnabled: true, platformFeePct: 0 },
        ctx,
      ),
    ).rejects.toThrow();
  });

  it("couriers: add, refuse a duplicate name, edit", async () => {
    const c = {
      id: "",
      name: "Citypak",
      codePattern: String.raw`^CP\d{6}$`,
      sampleCode: "CP123456",
      trackingUrlTemplate: "https://citypak.lk/t/{code}",
      isActive: true,
    };
    expect((await saveCourierFor(admin, c, ctx)).ok).toBe(true);
    const dup = await saveCourierFor(admin, c, ctx);
    expect(!dup.ok && dup.fields?.name).toBeTruthy();
    const saved = await CourierModel.findOne({ name: "Citypak" }).lean();
    expect((await saveCourierFor(admin, { ...c, id: String(saved?._id), isActive: false }, ctx)).ok).toBe(
      true,
    );
    expect((await CourierModel.findById(saved?._id).lean())?.isActive).toBe(false);
  });

  it("brands: new brand gets a fixed slug; renaming keeps it", async () => {
    expect((await saveBrandFor(admin, { id: "", name: "Nothing Phone", isActive: true }, ctx)).ok).toBe(true);
    const b = await BrandModel.findOne({ name: "Nothing Phone" }).lean();
    expect(b?.slug).toBe("nothing-phone");
    await saveBrandFor(admin, { id: String(b?._id), name: "Nothing", isActive: false }, ctx);
    expect(await BrandModel.findById(b?._id).lean()).toMatchObject({
      name: "Nothing",
      slug: "nothing-phone",
      isActive: false,
    });
    expect((await saveBrandFor(admin, { id: "", name: "Nothing", isActive: true }, ctx)).ok).toBe(false);
  });

  it("categories: create with a template; choices only kept for list fields", async () => {
    const r = await saveCategoryFor(
      admin,
      {
        id: "",
        name: "Tablets",
        icon: "phone",
        requiresSerial: true,
        isActive: true,
        sortOrder: 9,
        specTemplate: [
          {
            key: "storage",
            label: "Storage",
            type: "select",
            unit: "",
            options: ["128GB", "256GB"],
            filterable: true,
          },
          {
            key: "screen",
            label: "Screen",
            type: "number",
            unit: "in",
            options: ["ignored"],
            filterable: false,
          },
        ],
      },
      ctx,
    );
    expect(r.ok).toBe(true);
    const c = await CategoryModel.findById(r.id).lean();
    expect(c?.slug).toBe("tablets");
    expect(c?.specTemplate.map((f) => [f.key, f.options])).toEqual([
      ["storage", ["128GB", "256GB"]],
      ["screen", []],
    ]);
  });

  it("stock overview and report read across shops", async () => {
    await InventoryModel.updateOne({}, { $set: { available: 0 } });
    const low = await listLowStockFor(admin);
    expect(low[0]?.available).toBe(0);
    const report = await getReportFor(admin);
    expect(report.months.length).toBeGreaterThan(0);
    expect(
      report.months.every((m) => m.feeCents === Math.round((m.deliveredItemsCents * report.feeBp) / 10_000)),
    ).toBe(true);
  });
});
