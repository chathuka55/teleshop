import { Types, type ClientSession } from "mongoose";
import type { PackageStatus } from "@/modules/orders/types";
import type { ProductReviewDTO } from "@/modules/reviews/types";
import { connectDB } from "../mongoose";
import { OrderModel } from "../models/order.model";
import { ProductModel } from "../models/product.model";
import { ReviewModel } from "../models/review.model";
import { SellerModel } from "../models/seller.model";
import { UserModel } from "../models/user.model";
import { $in } from "../operators";
import { publicReviewerName } from "@/lib/utils/strings";

/** The ordered item a customer wants to review — only from their own order. */
export type ReviewTarget = {
  orderId: string;
  itemId: string;
  productId: string;
  sellerId: string;
  packageStatus: PackageStatus;
  productSlug: string;
};

export async function findReviewTarget(
  customerId: string,
  orderNo: string,
  itemId: string,
): Promise<ReviewTarget | null> {
  await connectDB();
  const o = await OrderModel.findOne({ orderNo, customerId })
    .select("packages.sellerId packages.status packages.items._id packages.items.productId")
    .lean<{
      _id: Types.ObjectId;
      packages: {
        sellerId: Types.ObjectId;
        status: PackageStatus;
        items: { _id: Types.ObjectId; productId: Types.ObjectId }[];
      }[];
    }>();
  if (!o) return null;
  for (const p of o.packages) {
    const item = p.items.find((i) => i._id.toString() === itemId);
    if (!item) continue;
    const product = await ProductModel.findById(item.productId).select("slug").lean<{ slug: string }>();
    return {
      orderId: o._id.toString(),
      itemId,
      productId: item.productId.toString(),
      sellerId: p.sellerId.toString(),
      packageStatus: p.status,
      productSlug: product?.slug ?? "",
    };
  }
  return null;
}

export async function insertReview(
  review: {
    target: ReviewTarget;
    customerId: string;
    rating: number;
    title: string;
    comment: string;
  },
  session: ClientSession,
): Promise<string> {
  const [doc] = await ReviewModel.create(
    [
      {
        productId: new Types.ObjectId(review.target.productId),
        sellerId: new Types.ObjectId(review.target.sellerId),
        customerId: new Types.ObjectId(review.customerId),
        orderId: new Types.ObjectId(review.target.orderId),
        itemId: new Types.ObjectId(review.target.itemId),
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        status: "visible",
      },
    ],
    { session },
  );
  if (!doc) throw new Error("Review insert returned nothing");
  return doc._id.toString();
}

/** Running average: (average × count + rating) / (count + 1), from the stored values, in one write. */
const addToRating = (rating: number) => {
  const count = { $ifNull: ["$rating.count", 0] };
  const average = { $ifNull: ["$rating.average", 0] };
  return [
    {
      $set: {
        "rating.count": { $add: [count, 1] },
        "rating.average": {
          $round: [
            { $divide: [{ $add: [{ $multiply: [average, count] }, rating] }, { $add: [count, 1] }] },
            2,
          ],
        },
      },
    },
  ];
};

/** Updates the cached product and shop ratings (docs/08 "denormalised caches"). */
export async function addRatingToCaches(
  productId: string,
  sellerId: string,
  rating: number,
  session: ClientSession,
): Promise<void> {
  await ProductModel.updateOne({ _id: new Types.ObjectId(productId) }, addToRating(rating), { session });
  await SellerModel.updateOne({ _id: new Types.ObjectId(sellerId) }, addToRating(rating), { session });
}

export async function listVisibleProductReviews(productId: string, limit = 20): Promise<ProductReviewDTO[]> {
  if (!/^[a-f0-9]{24}$/.test(productId)) return [];
  await connectDB();
  const rows = await ReviewModel.find({ productId: new Types.ObjectId(productId), status: "visible" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("customerId rating title comment sellerReply createdAt")
    .lean<
      {
        _id: Types.ObjectId;
        customerId: Types.ObjectId;
        rating: number;
        title: string;
        comment: string;
        sellerReply: string | null;
        createdAt: Date;
      }[]
    >();
  const users = await UserModel.find({ _id: $in(rows.map((r) => r.customerId)) })
    .select("name")
    .lean<{ _id: Types.ObjectId; name: string }[]>();
  const nameById = new Map(users.map((u) => [u._id.toString(), u.name]));
  return rows.map((r) => ({
    id: r._id.toString(),
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    sellerReply: r.sellerReply,
    authorName: publicReviewerName(nameById.get(r.customerId.toString()) ?? ""),
    createdAt: r.createdAt.toISOString(),
  }));
}
