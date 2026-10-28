import { Types } from "mongoose";
import { connectDB } from "../mongoose";
import { OrderModel } from "../models/order.model";
import { PaymentModel } from "../models/payment.model";
import { PayoutModel } from "../models/payout.model";
import { SellerModel } from "../models/seller.model";
import { $in } from "../operators";

/**
 * Seller payouts (P7, docs/08 `payouts`). A payout covers the shop's delivered packages whose COD
 * was collected in [periodStart, periodEnd). The next one starts where the last ended, so no
 * package is paid twice; the unique { sellerId, periodStart } index stops a double click.
 */

export type CollectedPackage = {
  orderNo: string;
  packageId: string;
  itemsCents: number;
  deliveryCents: number;
  collectedAt: Date;
};

export type PayoutShop = {
  id: string;
  shopName: string;
  status: "approved" | "suspended";
  bank: { bank: string; branch: string; last4: string } | null;
};

export async function listPayableShops(): Promise<PayoutShop[]> {
  await connectDB();
  const shops = await SellerModel.find({ approvalStatus: $in(["approved", "suspended"]) })
    .sort({ shopName: 1 })
    .limit(500)
    .select("shopName approvalStatus payoutAccount")
    .lean<
      {
        _id: Types.ObjectId;
        shopName: string;
        approvalStatus: PayoutShop["status"];
        payoutAccount?: { bank?: string; branch?: string; last4?: string } | null;
      }[]
    >();
  return shops.map((s) => ({
    id: s._id.toString(),
    shopName: s.shopName,
    status: s.approvalStatus,
    bank: s.payoutAccount?.last4
      ? {
          bank: s.payoutAccount.bank ?? "",
          branch: s.payoutAccount.branch ?? "",
          last4: s.payoutAccount.last4,
        }
      : null,
  }));
}

/** End of the shop's latest payout (the next period starts there), or null for the first one. */
export async function lastPayoutEnd(sellerId: string): Promise<Date | null> {
  await connectDB();
  const p = await PayoutModel.findOne({ sellerId: new Types.ObjectId(sellerId) })
    .sort({ periodEnd: -1 })
    .select("periodEnd")
    .lean<{ periodEnd: Date }>();
  return p?.periodEnd ?? null;
}

/** Delivered packages of the shop with COD collected in [since, until). */
export async function collectedPackages(
  sellerId: string,
  since: Date | null,
  until: Date,
): Promise<CollectedPackage[]> {
  await connectDB();
  const seller = new Types.ObjectId(sellerId);
  // Dotted fields (a plain $elemMatch would be neutralised by sanitizeFilter); packages are
  // filtered to this shop's delivered ones below.
  const orders = await OrderModel.find({ "packages.sellerId": seller, "packages.status": "delivered" })
    .select(
      "orderNo packages._id packages.sellerId packages.status packages.subtotalCents packages.deliveryCents",
    )
    .lean<
      {
        _id: Types.ObjectId;
        orderNo: string;
        packages: {
          _id: Types.ObjectId;
          sellerId: Types.ObjectId;
          status: string;
          subtotalCents: number;
          deliveryCents: number;
        }[];
      }[]
    >();
  if (!orders.length) return [];
  const payments = await PaymentModel.find({ orderId: $in(orders.map((o) => o._id)) })
    .select("perPackage")
    .lean<{ perPackage?: { packageId: Types.ObjectId; status: string; collectedAt?: Date | null }[] }[]>();
  const collected = new Map(
    payments.flatMap((p) =>
      (p.perPackage ?? [])
        .filter((x) => x.status === "paid" && x.collectedAt)
        .map((x) => [x.packageId.toString(), x.collectedAt as Date] as const),
    ),
  );
  return orders.flatMap((o) =>
    o.packages
      .filter((p) => p.sellerId.equals(seller) && p.status === "delivered")
      .flatMap((p) => {
        const at = collected.get(p._id.toString());
        if (!at || at >= until || (since && at < since)) return [];
        return [
          {
            orderNo: o.orderNo,
            packageId: p._id.toString(),
            itemsCents: p.subtotalCents,
            deliveryCents: p.deliveryCents,
            collectedAt: at,
          },
        ];
      }),
  );
}

export async function insertPayout(p: {
  sellerId: string;
  periodStart: Date;
  periodEnd: Date;
  orderCount: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
}): Promise<string> {
  await connectDB();
  const doc = await PayoutModel.create({
    ...p,
    sellerId: new Types.ObjectId(p.sellerId),
    status: "scheduled",
  });
  return doc._id.toString();
}

export type PayoutRecord = {
  id: string;
  sellerId: string;
  periodStart: Date;
  periodEnd: Date;
  orderCount: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
  status: "scheduled" | "paid";
  paidAt: Date | null;
  reference: string | null;
};

export async function listPayouts(status: "scheduled" | "paid", limit = 100): Promise<PayoutRecord[]> {
  await connectDB();
  const rows = await PayoutModel.find({ status })
    .sort(status === "paid" ? { paidAt: -1 } : { periodEnd: 1 })
    .limit(limit)
    .lean<(Omit<PayoutRecord, "id" | "sellerId"> & { _id: Types.ObjectId; sellerId: Types.ObjectId })[]>();
  return rows.map(({ _id, sellerId, ...r }) => ({
    ...r,
    id: _id.toString(),
    sellerId: sellerId.toString(),
    paidAt: r.paidAt ?? null,
    reference: r.reference ?? null,
  }));
}

/** scheduled → paid with the bank transfer reference. Returns the payout, or null if not scheduled. */
export async function markPayoutPaid(id: string, reference: string, at: Date): Promise<PayoutRecord | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await connectDB();
  const r = await PayoutModel.findOneAndUpdate(
    { _id: new Types.ObjectId(id), status: "scheduled" },
    { $set: { status: "paid", paidAt: at, reference } },
    { new: true },
  ).lean<Omit<PayoutRecord, "id" | "sellerId"> & { _id: Types.ObjectId; sellerId: Types.ObjectId }>();
  if (!r) return null;
  const { _id, sellerId, ...rest } = r;
  return {
    ...rest,
    id: _id.toString(),
    sellerId: sellerId.toString(),
    paidAt: rest.paidAt ?? null,
    reference,
  };
}
