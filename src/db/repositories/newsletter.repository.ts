import { connectDB } from "../mongoose";
import { NewsletterSubscriberModel } from "../models/newsletter-subscriber.model";

export type NewsletterSource = "home";

const isDuplicateKey = (e: unknown): boolean => (e as { code?: number } | null)?.code === 11000;

/**
 * Subscribes `email` (already lower-cased by the Zod schema). Idempotent: signing up again
 * refreshes the consent time and re-subscribes someone who had left. Two simultaneous sign-ups
 * of the same address race on the unique index; the loser simply retries as an update.
 */
export async function upsertSubscriber(email: string, source: NewsletterSource, now: Date): Promise<void> {
  await connectDB();
  const write = (): Promise<unknown> =>
    NewsletterSubscriberModel.updateOne(
      { email },
      {
        $set: { status: "subscribed", source, consentAt: now },
        $unset: { unsubscribedAt: 1 },
        $setOnInsert: { email },
      },
      { upsert: true, runValidators: true },
    );
  try {
    await write();
  } catch (e) {
    if (!isDuplicateKey(e)) throw e;
    await write();
  }
}

/** For tests and a future admin export: the stored state of one address, or null. */
export async function findSubscriber(
  email: string,
): Promise<{ email: string; status: string; consentAt: Date; source: string } | null> {
  await connectDB();
  return NewsletterSubscriberModel.findOne({ email })
    .select("email status consentAt source -_id")
    .lean<{ email: string; status: string; consentAt: Date; source: string }>();
}
