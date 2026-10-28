import { z } from "zod";
import { objectId, orderNo } from "@/lib/validation/common";

/** Drops control characters (keeps new lines and tabs). Reviews are plain text — React escapes the rest. */
export function stripControlChars(v: string): string {
  return [...v]
    .filter((c) => {
      const code = c.charCodeAt(0);
      return c === "\n" || c === "\t" || (code >= 32 && code !== 127);
    })
    .join("");
}

const plainText = (max: number) =>
  z.string().trim().max(max, `Keep it under ${max} characters`).transform(stripControlChars).default("");

export const createReviewSchema = z.object({
  orderNo,
  itemId: objectId,
  // Missing rating = NaN → invalid_type, so the type error needs the same friendly message.
  rating: z.coerce
    .number({ error: "Choose a star rating" })
    .int("Choose a star rating")
    .min(1, "Choose a star rating")
    .max(5, "Choose a star rating"),
  title: plainText(100),
  comment: plainText(2000),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
