import "server-only";
import { getCurrentUser, requireRole, requireUser } from "@/lib/auth/guards";
import type { SellerApplicationInput } from "@/modules/auth/schema";
import type { ShopSettingsInput } from "./schema";
import {
  applyForShopFor,
  getApplicationFor,
  getDashboardFor,
  getPayoutsFor,
  getShopSettingsFor,
  setShopCoverFor,
  updateShopSettingsFor,
} from "./service";
import type {
  PayoutsPageDTO,
  SellerDashboardDTO,
  ShopActionResult,
  ShopApplicationDTO,
  ShopSettingsDTO,
} from "./types";

/** Session-bound wrappers. Shop pages need an approved seller; applying needs any signed-in user. */

export async function getMyApplication(): Promise<ShopApplicationDTO | null> {
  const user = await getCurrentUser();
  return user ? getApplicationFor(user) : null;
}

export async function applyForShop(
  input: SellerApplicationInput,
  document: Uint8Array | null,
  ip: string | null,
): Promise<ShopActionResult> {
  return applyForShopFor(await requireUser(), input, { ip, document });
}

export async function getMyShopSettings(): Promise<ShopSettingsDTO | null> {
  return getShopSettingsFor(await requireRole("seller"));
}

export async function updateMyShopSettings(
  input: ShopSettingsInput,
  ip: string | null,
): Promise<ShopActionResult> {
  return updateShopSettingsFor(await requireRole("seller"), input, { ip });
}

export async function setMyShopCover(file: File | null, ip: string | null): Promise<ShopActionResult> {
  return setShopCoverFor(await requireRole("seller"), file, { ip });
}

export async function getMyPayouts(): Promise<PayoutsPageDTO | null> {
  return getPayoutsFor(await requireRole("seller"));
}

export async function getMyDashboard(): Promise<SellerDashboardDTO | null> {
  return getDashboardFor(await requireRole("seller"));
}
