import "server-only";
import { requireUser } from "@/lib/auth/guards";
import type { CreateReviewInput } from "./schema";
import { createReviewFor } from "./service";
import type { CreateReviewResult } from "./types";

/** Signed-in customer's review (session-bound wrapper around createReviewFor). */
export async function createReview(input: CreateReviewInput, ip: string | null): Promise<CreateReviewResult> {
  return createReviewFor(await requireUser(), input, { ip });
}
