import "server-only";
import { upsertSubscriber } from "@/db/repositories/newsletter.repository";

/**
 * Newsletter sign-up (P3-T07). Public on purpose; the action rate limits it. The answer never
 * says whether the address was already on the list (no email enumeration — docs/10 §1).
 */
export async function subscribeToNewsletter(email: string, now: Date = new Date()): Promise<void> {
  await upsertSubscriber(email, "home", now);
}
