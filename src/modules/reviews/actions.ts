"use server";

import { revalidatePath } from "next/cache";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import { createReview } from "./customer";
import { createReviewSchema } from "./schema";

/** parse (Zod) → rate limit 5/min (doc 09) → service (verified purchase, one per item). */
export async function createReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = createReviewSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));

  const ip = await clientIp();
  const limit = await rateLimit(`review:${ip ?? "unknown"}`, { limit: 5, windowMs: 60_000 });
  if (!limit.ok) {
    return {
      status: "error",
      message: `Too many reviews at once. Try again in ${limit.retryAfterSeconds} seconds.`,
      values: echoValues(formData),
    };
  }

  const r = await createReview(parsed.data, ip);
  if (!r.ok) return { status: "error", message: r.message, values: echoValues(formData) };
  revalidatePath(`/account/orders/${parsed.data.orderNo}`);
  if (r.productSlug) revalidatePath(`/p/${r.productSlug}`);
  return { status: "ok", message: "Thanks — your review is live." };
}
