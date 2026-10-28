import "server-only";
import { randomBytes } from "node:crypto";
import { countLowStock } from "@/db/repositories/seller-product.repository";
import {
  createApplication,
  findApplicationByUser,
  findOwnShop,
  listSellerPayouts,
  resubmitApplication,
  sellerPackageTotals,
  setShopCover,
  shopSlugTaken,
  updateOwnShop,
} from "@/db/repositories/seller-shop.repository";
import { getSettings } from "@/db/repositories/settings.repository";
import type { SessionUser } from "@/lib/auth/claims";
import { InvalidImageError } from "@/lib/images/avatar";
import { processProductImage } from "@/lib/images/product";
import { deleteObject, ownObjectPath, putPublicImage, randomObjectPath } from "@/lib/storage/blob";
import { audit } from "@/modules/audit/service";
import type { SellerApplicationInput } from "@/modules/auth/schema";
import { slugify } from "@/modules/products/access";
import { colomboMonthStart, deliveredEarnings, inProgressValue, liveOrders } from "./access";
import { sendShopApplicationEmail } from "./emails";
import type { ShopSettingsInput } from "./schema";
import type {
  PayoutsPageDTO,
  SellerDashboardDTO,
  ShopActionResult,
  ShopApplicationDTO,
  ShopSettingsDTO,
} from "./types";

/** The shop's own settings, money and application (P6-T01, T02, T05). */

const COVER_FOLDER = "shops";
const NO_SHOP: ShopActionResult = { ok: false, message: "We couldn't find your shop." };

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

// ---- Application (P6-T01) ----

export async function getApplicationFor(user: SessionUser): Promise<ShopApplicationDTO | null> {
  return findApplicationByUser(user.id);
}

async function uniqueShopSlug(name: string): Promise<string> {
  const base = slugify(name).slice(0, 70);
  if (base.length >= 2 && !(await shopSlugTaken(base))) return base;
  for (let i = 0; i < 5; i++) {
    const s = `${base || "shop"}-${randomBytes(2).toString("hex")}`;
    if (!(await shopSlugTaken(s))) return s;
  }
  throw new Error("Could not find a free shop slug");
}

/**
 * A signed-in customer applies to sell (P6-T01). The shop starts `pending`; an admin approves it
 * (P7), which also makes the user a seller. A rejected application can be fixed and re-sent.
 */
export async function applyForShopFor(
  user: SessionUser,
  input: SellerApplicationInput,
  ctx: { ip: string | null },
): Promise<ShopActionResult> {
  if (user.role !== "customer") {
    return { ok: false, message: "This account can't open a shop. Sign in with your own customer account." };
  }
  if (!user.emailVerified)
    return { ok: false, message: "Please verify your email first — check your inbox." };

  const application = {
    shopName: input.shopName,
    shopType: input.shopType,
    businessRegNo: input.businessRegNo,
    address: { line1: input.addressLine1, city: input.city, district: input.district },
    phone: input.phone,
  };
  const existing = await findApplicationByUser(user.id);
  if (existing && existing.status !== "rejected") {
    return {
      ok: false,
      message:
        existing.status === "pending"
          ? "Your application is already being reviewed."
          : existing.status === "approved"
            ? "Your shop is already approved — open the seller dashboard."
            : "This shop is suspended. Please contact support.",
    };
  }

  let sellerId: string | null;
  try {
    sellerId = existing
      ? await resubmitApplication(user.id, application)
      : await createApplication(user.id, await uniqueShopSlug(input.shopName), application);
  } catch (e) {
    // The unique userId index: a second tab applied at the same moment.
    if (isDuplicateKey(e)) return { ok: false, message: "Your application is already being reviewed." };
    throw e;
  }
  if (!sellerId) return { ok: false, message: "Your application changed meanwhile. Reload the page." };

  await audit.log({
    actorId: user.id,
    actorRole: user.role,
    action: existing ? "seller.reapplied" : "seller.applied",
    entity: "seller",
    entityId: sellerId,
    ip: ctx.ip,
  });
  await sendShopApplicationEmail(user.email, user.name, input.shopName).catch(() => undefined);
  return { ok: true, message: "Application sent. We review it within 24 hours and email you the result." };
}

// ---- Settings (P6-T05) ----

export async function getShopSettingsFor(user: SessionUser): Promise<ShopSettingsDTO | null> {
  return user.sellerId ? findOwnShop(user.sellerId) : null;
}

export async function updateShopSettingsFor(
  user: SessionUser,
  input: ShopSettingsInput,
  ctx: { ip: string | null },
): Promise<ShopActionResult> {
  if (!user.sellerId) return NO_SHOP;
  const ok = await updateOwnShop(user.sellerId, {
    description: input.description,
    openingHours: input.openingHours,
    phone: input.phone,
    address: {
      line1: input.addressLine1,
      city: input.city,
      district: input.district,
      postalCode: input.postalCode || null,
    },
    tags: input.tags,
    dispatchDays: input.dispatchDays,
    payoutAccount: input.payoutLast4
      ? { bank: input.payoutBank, branch: input.payoutBranch, last4: input.payoutLast4 }
      : null,
  });
  if (!ok) return NO_SHOP;
  await audit.log({
    actorId: user.id,
    actorRole: "seller",
    action: "seller.settings",
    entity: "seller",
    entityId: user.sellerId,
    data: { payoutAccount: !!input.payoutLast4 },
    ip: ctx.ip,
  });
  return { ok: true, message: "Shop settings saved." };
}

/** Cover photo for the public shop page: same checks as product photos. `null` removes it. */
export async function setShopCoverFor(
  user: SessionUser,
  file: File | null,
  ctx: { ip: string | null },
): Promise<ShopActionResult> {
  if (!user.sellerId) return NO_SHOP;
  let url: string | null = null;
  let path: string | null = null;
  if (file) {
    let image: Awaited<ReturnType<typeof processProductImage>>;
    try {
      image = await processProductImage(new Uint8Array(await file.arrayBuffer()));
    } catch (e) {
      if (e instanceof InvalidImageError) return { ok: false, message: e.message };
      throw e;
    }
    path = randomObjectPath(COVER_FOLDER, user.sellerId, "webp");
    url = await putPublicImage(path, image.bytes, image.contentType);
  }
  const r = await setShopCover(user.sellerId, url);
  if (!r) {
    if (path) await deleteObject(path);
    return NO_SHOP;
  }
  // Only our own uploads are deleted — the demo covers are shared files.
  const old = ownObjectPath(r.previous, COVER_FOLDER);
  if (old) await deleteObject(old);
  await audit.log({
    actorId: user.id,
    actorRole: "seller",
    action: file ? "seller.cover.set" : "seller.cover.remove",
    entity: "seller",
    entityId: user.sellerId,
    ip: ctx.ip,
  });
  return { ok: true, message: file ? "Cover photo updated." : "Cover photo removed." };
}

// ---- Money (P6-T02, T05) ----

export async function getPayoutsFor(user: SessionUser, now = new Date()): Promise<PayoutsPageDTO | null> {
  if (!user.sellerId) return null;
  const [settings, month, allTime, payouts, shop] = await Promise.all([
    getSettings(),
    sellerPackageTotals(user.sellerId, colomboMonthStart(now)),
    sellerPackageTotals(user.sellerId),
    listSellerPayouts(user.sellerId),
    findOwnShop(user.sellerId),
  ]);
  const earned = deliveredEarnings(allTime, settings.platformFeeBp);
  const paidOut = payouts.filter((p) => p.status === "paid").reduce((n, p) => n + p.netCents, 0);
  const scheduled = payouts.filter((p) => p.status === "scheduled").reduce((n, p) => n + p.netCents, 0);
  return {
    feeBp: settings.platformFeeBp,
    month: deliveredEarnings(month, settings.platformFeeBp),
    allTime: earned,
    inProgressCents: inProgressValue(allTime),
    paidOutCents: paidOut,
    scheduledCents: scheduled,
    unpaidCents: Math.max(0, earned.netCents - paidOut - scheduled),
    payouts: payouts.map((p) => ({
      ...p,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
    account: shop?.payoutAccount ?? null,
  };
}

export async function getDashboardFor(
  user: SessionUser,
  now = new Date(),
): Promise<SellerDashboardDTO | null> {
  if (!user.sellerId) return null;
  const [payouts, month, shop, lowStock] = await Promise.all([
    getPayoutsFor(user, now),
    sellerPackageTotals(user.sellerId, colomboMonthStart(now)),
    findOwnShop(user.sellerId),
    countLowStock(user.sellerId),
  ]);
  const live = liveOrders(month);
  const sales = deliveredEarnings(month, payouts?.feeBp ?? 0);
  return {
    monthLabel: now.toLocaleDateString("en-LK", { month: "long", year: "numeric", timeZone: "Asia/Colombo" }),
    orders: live.count,
    salesCents: sales.grossCents,
    avgOrderCents: live.count ? Math.round(live.valueCents / live.count) : 0,
    cancelled: month.cancelled.packages + month.returned.packages,
    rating: shop?.rating ?? { average: 0, count: 0 },
    lowStock,
    unpaidCents: payouts?.unpaidCents ?? 0,
    inProgressCents: payouts?.inProgressCents ?? 0,
  };
}
