import { Types, type ClientSession } from "mongoose";
import { connectDB } from "../mongoose";
import { PaymentModel } from "../models/payment.model";

type PayStatus = "pending" | "paid" | "failed";

/**
 * Cash on Delivery per package (P7-T02): the courier collects each package's own amount. The
 * order's payment is `paid` once every live package is paid, `failed` when none is left to pay.
 */
export async function setPackagePayment(
  orderId: string,
  packageId: string,
  status: PayStatus,
  at: Date,
  livePackageIds: readonly string[],
  session: ClientSession,
): Promise<void> {
  await connectDB();
  const p = await PaymentModel.findOne({ orderId: new Types.ObjectId(orderId) })
    .session(session)
    .lean<{ _id: Types.ObjectId; perPackage: { packageId: Types.ObjectId; status: string }[] }>();
  if (!p) return;
  const perPackage = p.perPackage.map((x) =>
    x.packageId.toString() === packageId ? { ...x, status, collectedAt: status === "paid" ? at : null } : x,
  );
  const live = perPackage.filter((x) => livePackageIds.includes(x.packageId.toString()));
  const overall: PayStatus =
    live.length === 0 ? "failed" : live.every((x) => x.status === "paid") ? "paid" : "pending";
  await PaymentModel.updateOne(
    { _id: p._id },
    { $set: { perPackage, status: overall, paidAt: overall === "paid" ? at : null } },
    { session },
  );
}
