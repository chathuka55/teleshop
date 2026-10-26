import { z } from "zod";

export const productIdSchema = z.string().regex(/^[a-f0-9]{24}$/, "Invalid product");

export const toggleWishlistSchema = z.object({ productId: productIdSchema, saved: z.boolean() });

/** Guest list sent from localStorage when the user signs in (max 200, same as the server list). */
export const mergeWishlistSchema = z.array(productIdSchema).max(200);
