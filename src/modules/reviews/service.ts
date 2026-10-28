import "server-only";
import {
  addRatingToCaches,
  findReviewTarget,
  insertReview,
  listVisibleProductReviews,
} from "@/db/repositories/review.repository";
import { withTransaction } from "@/db/mongoose";
import type { SessionUser } from "@/lib/auth/claims";
import { audit } from "@/modules/audit/service";
import { canReviewPackage, isOwnProduct } from "./access";
import type { CreateReviewInput } from "./schema";
import type { CreateReviewResult, ProductReviewDTO } from "./types";

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

const fail = (
  code: Exclude<CreateReviewResult, { ok: true }>["code"],
  message: string,
): CreateReviewResult => ({ ok: false, code, message });

/**
 * Verified-purchase review (P5-T05): the item must be in the customer's own delivered package,
 * one review per ordered item (unique index), and the product + shop rating caches move in the
 * same transaction as the insert.
 */
export async function createReviewFor(
  user: SessionUser,
  input: CreateReviewInput,
  ctx: { ip: string | null },
): Promise<CreateReviewResult> {
  const target = await findReviewTarget(user.id, input.orderNo, input.itemId);
  if (!target) return fail("NOT_FOUND", "We couldn't find that item in your orders.");
  if (!canReviewPackage(target.packageStatus)) {
    return fail("NOT_DELIVERED", "You can review this item once it has been delivered.");
  }
  if (isOwnProduct(user, target.sellerId)) {
    return fail("OWN_PRODUCT", "Shop owners can't review their own products.");
  }

  let reviewId: string;
  try {
    reviewId = await withTransaction(async (session) => {
      const id = await insertReview(
        { target, customerId: user.id, rating: input.rating, title: input.title, comment: input.comment },
        session,
      );
      await addRatingToCaches(target.productId, target.sellerId, input.rating, session);
      return id;
    });
  } catch (e) {
    if (isDuplicateKey(e)) return fail("ALREADY_REVIEWED", "You've already reviewed this item.");
    throw e;
  }

  await audit.log({
    actorId: user.id,
    actorRole: user.role,
    action: "review.created",
    entity: "review",
    entityId: reviewId,
    data: { productId: target.productId, rating: input.rating },
    ip: ctx.ip,
  });
  return { ok: true, productSlug: target.productSlug };
}

export async function listProductReviews(productId: string): Promise<ProductReviewDTO[]> {
  return listVisibleProductReviews(productId);
}
