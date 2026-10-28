/** A published review on the product page — first name + initial only, no customer ids. */
export type ProductReviewDTO = {
  id: string;
  rating: number;
  title: string;
  comment: string;
  sellerReply: string | null;
  authorName: string;
  createdAt: string;
};

export type CreateReviewResult =
  | { ok: true; productSlug: string }
  | {
      ok: false;
      code: "NOT_FOUND" | "NOT_DELIVERED" | "OWN_PRODUCT" | "ALREADY_REVIEWED";
      message: string;
    };
