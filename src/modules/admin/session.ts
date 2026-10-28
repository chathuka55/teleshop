import "server-only";
import { getCurrentUser } from "@/lib/auth/guards";
import {
  addTrackingCodeFor,
  adminPackageStepFor,
  getOrderFor,
  getTrackingQueueFor,
  listCouriersFor,
  listOrdersFor,
} from "@/modules/orders/admin";
import type { AddTrackingCodeInput, AdminPackageStepInput } from "@/modules/orders/admin-schema";
import type { OrderStatus } from "@/modules/orders/types";
import type { ProductStatus } from "@/modules/products/types";
import {
  decideSellerFor,
  getAdminDashboardFor,
  getProductFor,
  getSellerFor,
  listProductsFor,
  listSellersFor,
  moderateProductFor,
} from "./service";
import type { AdminSellerRowDTO } from "./types";

/**
 * Session-bound admin calls for pages and actions. The services assert the admin role (TOTP
 * passed) themselves, so these only fetch the current user.
 */

export const adminDashboard = async () => getAdminDashboardFor(await getCurrentUser());
export const adminTrackingQueue = async () => getTrackingQueueFor(await getCurrentUser());
export const adminOrders = async (f: { status?: OrderStatus; q: string; page: number }) =>
  listOrdersFor(await getCurrentUser(), f);
export const adminOrder = async (orderNo: string) => getOrderFor(await getCurrentUser(), orderNo);
export const adminCouriers = async () => listCouriersFor(await getCurrentUser());
export const adminAddTrackingCode = async (input: AddTrackingCodeInput, ip: string | null) =>
  addTrackingCodeFor(await getCurrentUser(), input, { ip });
export const adminPackageStep = async (input: AdminPackageStepInput, ip: string | null) =>
  adminPackageStepFor(await getCurrentUser(), input, { ip });

export const adminSellers = async (status: AdminSellerRowDTO["status"]) =>
  listSellersFor(await getCurrentUser(), status);
export const adminSeller = async (id: string) => getSellerFor(await getCurrentUser(), id);
export const adminDecideSeller = async (
  input: { id: string; decision: "approve" | "reject"; reason: string },
  ip: string | null,
) => decideSellerFor(await getCurrentUser(), input, { ip });

export const adminProducts = async (status: ProductStatus) => listProductsFor(await getCurrentUser(), status);
export const adminProduct = async (id: string) => getProductFor(await getCurrentUser(), id);
export const adminModerateProduct = async (
  input: { id: string; decision: "approve" | "return" | "block"; note: string },
  ip: string | null,
) => moderateProductFor(await getCurrentUser(), input, { ip });
