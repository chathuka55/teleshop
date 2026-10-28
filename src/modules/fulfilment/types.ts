import type { PackageStatus, ShipmentDTO, TimelineEntryDTO } from "@/modules/orders/types";

/** One row of /seller/orders — the shop's own package of an order. */
export type SellerPackageSummaryDTO = {
  orderNo: string;
  placedAt: string;
  status: PackageStatus;
  itemCount: number;
  itemNames: string[];
  imageUrl: string | null;
  /** What the courier collects for this package (subtotal + delivery). */
  amountCents: number;
  city: string;
  district: string;
  deliveryMethod: "standard" | "express";
  missingSerials: number;
};

/** The shop's package on /seller/orders/[orderNo]. Address lines and phone only after accepting. */
export type SellerPackageDTO = {
  orderNo: string;
  placedAt: string;
  status: PackageStatus;
  deliveryMethod: "standard" | "express";
  subtotalCents: number;
  deliveryCents: number;
  amountCents: number;
  address: {
    recipientName: string;
    city: string;
    district: string;
    line1: string | null;
    line2: string | null;
    postalCode: string | null;
    phone: string | null;
  };
  items: {
    id: string;
    sku: string;
    name: string;
    variantLabel: string;
    imageUrl: string | null;
    qty: number;
    unitPriceCents: number;
    lineTotalCents: number;
    requiresSerial: boolean;
    serialNumbers: string[];
  }[];
  shipment: ShipmentDTO | null;
  timeline: TimelineEntryDTO[];
  cancelReason: string | null;
};

export type FulfilmentResult =
  | { ok: true; message: string }
  | {
      ok: false;
      code: "NOT_FOUND" | "WRONG_STATUS" | "SERIALS_MISSING" | "INVALID" | "CHANGED";
      message: string;
    };
