import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions } from "./_shared";

/** Newsletter sign-ups from the home page form (P3-T07, docs/08 §3.5). */
const newsletterSubscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    status: { type: String, enum: ["subscribed", "unsubscribed"], required: true, default: "subscribed" },
    /** Where the sign-up came from (form id), for consent records. */
    source: { type: String, enum: ["home"], required: true, default: "home" },
    /** When the visitor last opted in — the consent record. */
    consentAt: { type: Date, required: true },
    unsubscribedAt: { type: Date },
  },
  baseOptions,
);

export type NewsletterSubscriberDoc = InferSchemaType<typeof newsletterSubscriberSchema>;
export const NewsletterSubscriberModel =
  (models.NewsletterSubscriber as Model<NewsletterSubscriberDoc> | undefined) ??
  model<NewsletterSubscriberDoc>(
    "NewsletterSubscriber",
    newsletterSubscriberSchema,
    "newsletter_subscribers",
  );
