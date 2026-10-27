export type PackageStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type ShipmentDTO = {
  courierName: string;
  trackingCode: string;
  trackingUrl: string;
  handedOverAt: string;
};

export type TrackedPackageDTO = {
  id: string;
  sellerName: string;
  status: PackageStatus;
  itemCount: number;
  shipment: ShipmentDTO | null;
};

/** Public tracking result — no address, no prices, no customer details. */
export type TrackResultDTO = {
  orderNo: string;
  lastUpdate: { at: string; note: string };
  packages: TrackedPackageDTO[];
};

export type OrderStatus =
  "pending" | "in_progress" | "shipped" | "delivered" | "cancelled" | "partially_delivered";

export type PlaceOrderResult =
  | { ok: true; orderNo: string; replay: boolean }
  | {
      ok: false;
      code:
        | "NOT_ALLOWED"
        | "EMAIL_UNVERIFIED"
        | "COD_DISABLED"
        | "TOO_MANY_OPEN"
        | "ADDRESS_NOT_FOUND"
        | "EMPTY_CART"
        | "CART_CHANGED"
        | "OUT_OF_STOCK";
      message: string;
    };

/** One order as its customer sees it (confirmation page, account). */
export type CustomerOrderDTO = {
  orderNo: string;
  placedAt: string;
  status: OrderStatus;
  deliveryMethod: "standard" | "express";
  paymentMethod: "cod";
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  deliveryAddress: {
    recipientName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    district: string;
    postalCode: string | null;
  };
  packages: {
    id: string;
    sellerName: string;
    sellerSlug: string;
    status: PackageStatus;
    subtotalCents: number;
    deliveryCents: number;
    items: {
      sku: string;
      name: string;
      variantLabel: string;
      imageUrl: string | null;
      qty: number;
      unitPriceCents: number;
      lineTotalCents: number;
    }[];
  }[];
};

export type CustomerOrderSummaryDTO = {
  orderNo: string;
  placedAt: string;
  status: OrderStatus;
  totalCents: number;
  itemCount: number;
  packageCount: number;
};
