import type { PackageStatus } from "@/modules/orders/types";
import type { ProductCondition, ProductStatus, WarrantyType } from "@/modules/products/types";
import type { ShopType } from "@/modules/sellers/types";

/** Admin console DTOs that span modules (dashboard, approvals, moderation). */

export type AdminSellerRowDTO = {
  id: string;
  shopName: string;
  shopType: ShopType;
  ownerName: string;
  ownerEmail: string;
  city: string;
  district: string;
  businessRegNo: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  hasDocument: boolean;
  appliedAt: string;
};

export type AdminSellerDTO = AdminSellerRowDTO & {
  userId: string;
  slug: string;
  ownerEmailVerified: boolean;
  addressLine1: string;
  postalCode: string | null;
  phone: string;
  document: { contentType: string; size: number; uploadedAt: string } | null;
  rejectionReason: string | null;
  approvedAt: string | null;
};

export type AdminProductRowDTO = {
  id: string;
  name: string;
  shopName: string;
  categoryName: string;
  imageUrl: string | null;
  minPriceCents: number;
  status: ProductStatus;
  wasPublished: boolean;
  updatedAt: string;
};

export type AdminProductDTO = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  status: ProductStatus;
  moderationNote: string | null;
  wasPublished: boolean;
  sellerId: string;
  shopName: string;
  shopSlug: string;
  categoryName: string;
  brandName: string;
  condition: ProductCondition;
  shortDescription: string;
  description: string;
  highlights: string[];
  specs: { label: string; value: string }[];
  warranty: { months: number; type: WarrantyType };
  images: string[];
  variants: {
    sku: string;
    label: string;
    priceCents: number;
    compareAtCents: number | null;
    isActive: boolean;
  }[];
  updatedAt: string;
};

export type AdminDashboardDTO = {
  ordersToday: number;
  ordersMonth: number;
  deliveredMonthCents: number;
  packages: Record<PackageStatus, number>;
  pendingSellers: number;
  productsInReview: number;
};

export type AdminCustomerDTO = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "customer" | "seller" | "admin";
  status: "active" | "suspended";
  emailVerified: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
  orderCount: number;
  shopName: string | null;
};

export type AdminReviewDTO = {
  id: string;
  rating: number;
  title: string;
  comment: string;
  status: "visible" | "hidden" | "flagged";
  createdAt: string;
  productName: string;
  productSlug: string;
  shopName: string;
  customerName: string;
  customerEmail: string;
  orderNo: string;
};

export type PayoutCandidateDTO = {
  sellerId: string;
  shopName: string;
  shopStatus: "approved" | "suspended";
  bank: { bank: string; branch: string; last4: string } | null;
  periodStart: string;
  packageCount: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
};

export type AdminPayoutDTO = {
  id: string;
  sellerId: string;
  shopName: string;
  bank: { bank: string; branch: string; last4: string } | null;
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
  status: "scheduled" | "paid";
  paidAt: string | null;
  reference: string | null;
};

export type AuditEntryDTO = {
  id: string;
  at: string;
  actorRole: string;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string;
  data: string;
};

export type Paged<T> = { rows: T[]; total: number; page: number; pageSize: number };
