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
