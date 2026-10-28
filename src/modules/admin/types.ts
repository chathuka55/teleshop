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
