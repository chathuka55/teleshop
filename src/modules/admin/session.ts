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
  createPayoutFor,
  listAuditFor,
  listCustomersFor,
  listPayoutCandidatesFor,
  listPayoutsFor,
  listReviewsFor,
  markPayoutPaidFor,
  moderateReviewFor,
  setCustomerStatusFor,
} from "./people";
import {
  decideSellerFor,
  getAdminDashboardFor,
  getProductFor,
  getSellerFor,
  listProductsFor,
  listSellersFor,
  moderateProductFor,
  type SellerDecision,
} from "./service";
import type { AdminCustomerDTO, AdminReviewDTO, AdminSellerRowDTO } from "./types";

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
  input: { id: string; decision: SellerDecision; reason: string },
  ip: string | null,
) => decideSellerFor(await getCurrentUser(), input, { ip });

export const adminProducts = async (status: ProductStatus) => listProductsFor(await getCurrentUser(), status);
export const adminProduct = async (id: string) => getProductFor(await getCurrentUser(), id);
export const adminModerateProduct = async (
  input: { id: string; decision: "approve" | "return" | "block"; note: string },
  ip: string | null,
) => moderateProductFor(await getCurrentUser(), input, { ip });

export const adminCustomers = async (f: {
  q: string;
  role?: AdminCustomerDTO["role"];
  status?: AdminCustomerDTO["status"];
  page: number;
}) => listCustomersFor(await getCurrentUser(), f);
export const adminSetCustomerStatus = async (
  input: { id: string; status: "active" | "suspended"; reason: string },
  ip: string | null,
) => setCustomerStatusFor(await getCurrentUser(), input, { ip });

export const adminReviews = async (status: AdminReviewDTO["status"], page: number) =>
  listReviewsFor(await getCurrentUser(), status, page);
export const adminModerateReview = async (
  input: { id: string; action: "hide" | "show"; reason: string },
  ip: string | null,
) => moderateReviewFor(await getCurrentUser(), input, { ip });

export const adminPayoutCandidates = async () => listPayoutCandidatesFor(await getCurrentUser());
export const adminPayouts = async (status: "scheduled" | "paid") =>
  listPayoutsFor(await getCurrentUser(), status);
export const adminCreatePayout = async (sellerId: string, ip: string | null) =>
  createPayoutFor(await getCurrentUser(), sellerId, { ip });
export const adminMarkPayoutPaid = async (input: { id: string; reference: string }, ip: string | null) =>
  markPayoutPaidFor(await getCurrentUser(), input, { ip });

export const adminAudit = async (f: {
  action?: string;
  entityId?: string;
  actorEmail?: string;
  page: number;
}) => listAuditFor(await getCurrentUser(), f);
