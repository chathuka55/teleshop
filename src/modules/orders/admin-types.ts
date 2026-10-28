import type { OrderStatus, PackageStatus, ShipmentDTO, TimelineEntryDTO } from "./types";

/** One row of /admin/orders (A3). */
export type AdminOrderRowDTO = {
  orderNo: string;
  placedAt: string;
  status: OrderStatus;
  recipientName: string;
  city: string;
  district: string;
  totalCents: number;
  packages: { sellerName: string; status: PackageStatus }[];
};

export type CourierDTO = { id: string; name: string; codePattern: string; trackingUrlTemplate: string };

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

/** One order for an admin (A4): everything, including the customer's contact details. */
export type AdminOrderDTO = {
  orderNo: string;
  placedAt: string;
  status: OrderStatus;
  deliveryMethod: "standard" | "express";
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  cancelReason: string | null;
  customer: { id: string; name: string; email: string } | null;
  address: {
    recipientName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    district: string;
    postalCode: string | null;
  };
  payment: { status: PaymentStatus; paidAt: string | null } | null;
  packages: {
    id: string;
    sellerId: string;
    sellerName: string;
    sellerSlug: string;
    sellerPhone: string;
    status: PackageStatus;
    subtotalCents: number;
    deliveryCents: number;
    payment: { status: PaymentStatus; collectedAt: string | null } | null;
    shipment: ShipmentDTO | null;
    items: {
      id: string;
      sku: string;
      name: string;
      variantLabel: string;
      qty: number;
      unitPriceCents: number;
      lineTotalCents: number;
      serialNumbers: string[];
    }[];
  }[];
  timeline: (TimelineEntryDTO & { packageId: string | null; actorRole: string })[];
};

/** A package waiting for its courier tracking code (dashboard queue). */
export type TrackingQueueItemDTO = {
  orderNo: string;
  packageId: string;
  sellerName: string;
  city: string;
  district: string;
  amountCents: number;
  readySince: string;
};

export type AdminActionResult =
  { ok: true; message: string } | { ok: false; message: string; fields?: Record<string, string> };
