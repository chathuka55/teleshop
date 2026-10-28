import "server-only";
import { randomBytes } from "node:crypto";
import {
  findCategory,
  listAllBrands,
  listAllCategories,
  listAllCouriers,
  listLowStock,
  monthlyTotals,
  saveBrand,
  saveCategory,
  saveCourier,
  saveSettings,
  slugInUse,
  topSellersAndProducts,
  type BrandRow,
  type CategoryRow,
  type CourierRow,
  type LowStockRow,
  type MonthRow,
  type TopRow,
} from "@/db/repositories/admin-config.repository";
import { getSettings, type SettingsDTO } from "@/db/repositories/settings.repository";
import { assertRole } from "@/lib/auth/authorize";
import type { SessionUser } from "@/lib/auth/claims";
import { audit } from "@/modules/audit/service";
import type { AdminActionResult } from "@/modules/orders/admin-types";
import { slugify } from "@/modules/products/access";
import { colomboMonthStart, platformFee } from "@/modules/sellers/access";
import type { BrandInput, CategoryInput, CourierInput, SettingsInput } from "./config-schema";

/**
 * Admin configuration (P7-T03/T05): site settings, couriers, categories + spec templates, brands,
 * stock overview, reports. assertRole("admin") first; every change is audit-logged.
 */

const fail = (message: string, fields?: Record<string, string>): AdminActionResult => ({
  ok: false,
  message,
  ...(fields ? { fields } : {}),
});
const isDuplicateKey = (e: unknown): boolean =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

type Ctx = { ip: string | null };

async function log(
  admin: SessionUser,
  action: string,
  entity: string,
  entityId: string,
  data: Record<string, unknown>,
  ctx: Ctx,
) {
  await audit.log({ actorId: admin.id, actorRole: "admin", action, entity, entityId, data, ip: ctx.ip });
}

// ---- Settings (A13) ----

export async function getSettingsFor(user: SessionUser | null): Promise<SettingsDTO> {
  assertRole(user, ["admin"]);
  return getSettings();
}

export async function saveSettingsFor(
  user: SessionUser | null,
  input: SettingsInput,
  ctx: Ctx,
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  const before = await getSettings();
  const next = {
    deliveryFeeCents: input.deliveryFee,
    expressFeeCents: input.expressFee,
    codEnabled: input.codEnabled,
    platformFeeBp: input.platformFeePct,
    autoCancelHours: input.autoCancelHours,
  };
  await saveSettings(next);
  // Old → new for every value that changed (all of them are plain numbers / booleans).
  const changed = Object.fromEntries(
    (Object.keys(next) as (keyof typeof next)[])
      .filter((k) => before[k] !== next[k])
      .map((k) => [k, { from: before[k], to: next[k] }]),
  );
  await log(admin, "settings.updated", "settings", "global", changed, ctx);
  return {
    ok: true,
    message: Object.keys(changed).length
      ? `Saved.${!next.codEnabled ? " Cash on Delivery is now OFF — nobody can place an order." : ""}`
      : "Nothing changed.",
  };
}

// ---- Couriers (A13) ----

export async function listCouriersAdminFor(user: SessionUser | null): Promise<CourierRow[]> {
  assertRole(user, ["admin"]);
  return listAllCouriers();
}

export async function saveCourierFor(
  user: SessionUser | null,
  input: CourierInput,
  ctx: Ctx,
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  const { id, sampleCode: _sample, ...fields } = input;
  try {
    if (!(await saveCourier(id || null, fields)))
      return fail("We couldn't find that courier. Reload the page.");
  } catch (e) {
    if (isDuplicateKey(e))
      return fail("Another courier has this name.", { name: "Another courier has this name" });
    throw e;
  }
  await log(admin, id ? "courier.updated" : "courier.created", "courier", id || fields.name, fields, ctx);
  return { ok: true, message: id ? `${fields.name} saved.` : `${fields.name} added.` };
}

// ---- Brands (A7) ----

export async function listBrandsAdminFor(user: SessionUser | null): Promise<BrandRow[]> {
  assertRole(user, ["admin"]);
  return listAllBrands();
}

async function freeSlug(kind: "brand" | "category", name: string): Promise<string> {
  const base = slugify(name).slice(0, 50) || kind;
  if (!(await slugInUse(kind, base))) return base;
  return `${base}-${randomBytes(2).toString("hex")}`;
}

export async function saveBrandFor(
  user: SessionUser | null,
  input: BrandInput,
  ctx: Ctx,
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  try {
    const ok = input.id
      ? await saveBrand(input.id, input)
      : await saveBrand(null, { ...input, slug: await freeSlug("brand", input.name) });
    if (!ok) return fail("We couldn't find that brand. Reload the page.");
  } catch (e) {
    if (isDuplicateKey(e)) return fail("That brand already exists.", { name: "That brand already exists" });
    throw e;
  }
  await log(
    admin,
    input.id ? "brand.updated" : "brand.created",
    "brand",
    input.id || input.name,
    { name: input.name, isActive: input.isActive },
    ctx,
  );
  return { ok: true, message: input.id ? `${input.name} saved.` : `${input.name} added.` };
}

// ---- Categories (A7) ----

export async function listCategoriesAdminFor(user: SessionUser | null): Promise<CategoryRow[]> {
  assertRole(user, ["admin"]);
  return listAllCategories();
}

export async function getCategoryAdminFor(user: SessionUser | null, id: string): Promise<CategoryRow | null> {
  assertRole(user, ["admin"]);
  return findCategory(id);
}

export async function saveCategoryFor(
  user: SessionUser | null,
  input: CategoryInput,
  ctx: Ctx,
): Promise<AdminActionResult & { id?: string }> {
  const admin = assertRole(user, ["admin"]);
  const { id, ...fields } = input;
  let saved: string | null;
  try {
    saved = id
      ? await saveCategory(id, fields)
      : await saveCategory(null, { ...fields, slug: await freeSlug("category", fields.name) });
  } catch (e) {
    if (isDuplicateKey(e)) return fail("Another category has this link name. Change the name slightly.");
    throw e;
  }
  if (!saved) return fail("We couldn't find that category. Reload the page.");
  await log(
    admin,
    id ? "category.updated" : "category.created",
    "category",
    saved,
    { name: fields.name, fields: fields.specTemplate.length },
    ctx,
  );
  return { ok: true, id: saved, message: id ? "Category saved." : "Category added." };
}

// ---- Stock (A8) and reports (A12) ----

export async function listLowStockFor(user: SessionUser | null): Promise<LowStockRow[]> {
  assertRole(user, ["admin"]);
  return listLowStock();
}

export type ReportDTO = {
  months: (MonthRow & { feeCents: number; label: string })[];
  top: { shops: TopRow[]; products: TopRow[] };
  feeBp: number;
};

/** Last 6 months (Sri Lanka time) + this month's best shops and products. */
export async function getReportFor(user: SessionUser | null, now = new Date()): Promise<ReportDTO> {
  assertRole(user, ["admin"]);
  const thisMonth = colomboMonthStart(now);
  // 5 months before this one, at Colombo midnight on the 1st.
  const local = new Date(thisMonth.getTime() + 5.5 * 3_600_000);
  const since = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 5, 1) - 5.5 * 3_600_000);
  const [settings, months, top] = await Promise.all([
    getSettings(),
    monthlyTotals(since),
    topSellersAndProducts(thisMonth),
  ]);
  return {
    feeBp: settings.platformFeeBp,
    top,
    months: months.map((m) => ({
      ...m,
      feeCents: platformFee(m.deliveredItemsCents, settings.platformFeeBp),
      label: new Date(`${m.month}-01T00:00:00+05:30`).toLocaleDateString("en-LK", {
        month: "short",
        year: "numeric",
        timeZone: "Asia/Colombo",
      }),
    })),
  };
}
