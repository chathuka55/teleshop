export type ShopType = "mobile_shop" | "computer_shop" | "accessories_shop" | "general_tech";

/** The shop's own settings (S4). Bank details: name, branch and the last 4 digits only. */
export type ShopSettingsDTO = {
  shopName: string;
  slug: string;
  shopType: ShopType;
  description: string;
  openingHours: string;
  phone: string;
  address: { line1: string; city: string; district: string; postalCode: string };
  tags: string[];
  coverUrl: string | null;
  dispatchDays: number;
  payoutAccount: { bank: string; branch: string; last4: string } | null;
  rating: { average: number; count: number };
};

export type ShopApplicationDTO = {
  shopName: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason: string | null;
  submittedAt: string;
};

/** Money for a set of packages: COD collected, Teleshop's fee (on item value only), what the shop keeps. */
export type EarningsDTO = {
  deliveredPackages: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
};

export type PayoutDTO = {
  id: string;
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

export type PayoutsPageDTO = {
  feeBp: number;
  month: EarningsDTO;
  allTime: EarningsDTO;
  /** Still with the shop or the courier — paid out once delivered. */
  inProgressCents: number;
  paidOutCents: number;
  scheduledCents: number;
  /** Delivered and earned, not yet in a payout. */
  unpaidCents: number;
  payouts: PayoutDTO[];
  account: ShopSettingsDTO["payoutAccount"];
};

/** KPIs for /seller (S1), this calendar month in Sri Lanka time. */
export type SellerDashboardDTO = {
  monthLabel: string;
  orders: number;
  salesCents: number;
  avgOrderCents: number;
  cancelled: number;
  rating: { average: number; count: number };
  lowStock: number;
  unpaidCents: number;
  inProgressCents: number;
};

export type ShopActionResult =
  { ok: true; message: string } | { ok: false; message: string; fields?: Record<string, string> };
