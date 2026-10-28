import "server-only";
import { listSellerPackages } from "@/db/repositories/seller-order.repository";
import { findShopName } from "@/db/repositories/seller.repository";
import { requireRole } from "@/lib/auth/guards";
import type { RecordSerialsInput, SellerStepInput } from "./schema";
import { getSellerPackageFor, recordSerialsFor, sellerStepFor } from "./service";
import type { FulfilmentResult, SellerPackageDTO, SellerPackageSummaryDTO } from "./types";

/** Session-bound wrappers: requireRole("seller") admits approved shops only (sellerId set). */

/** Shop name + packages waiting to be accepted, for the portal navigation. */
export async function getMyShopNav(): Promise<{ shopName: string; newOrders: number }> {
  const user = await requireRole("seller");
  if (!user.sellerId) return { shopName: "My shop", newOrders: 0 };
  const [name, packages] = await Promise.all([
    findShopName(user.sellerId),
    listSellerPackages(user.sellerId),
  ]);
  return { shopName: name ?? "My shop", newOrders: packages.filter((p) => p.status === "pending").length };
}

export async function listMyPackages(): Promise<SellerPackageSummaryDTO[]> {
  const user = await requireRole("seller");
  return user.sellerId ? listSellerPackages(user.sellerId) : [];
}

export async function getMyPackage(orderNo: string): Promise<SellerPackageDTO | null> {
  return getSellerPackageFor(await requireRole("seller"), orderNo);
}

export async function sellerStep(input: SellerStepInput, ip: string | null): Promise<FulfilmentResult> {
  return sellerStepFor(await requireRole("seller"), input, { ip });
}

export async function recordSerials(input: RecordSerialsInput, ip: string | null): Promise<FulfilmentResult> {
  return recordSerialsFor(await requireRole("seller"), input, { ip });
}
