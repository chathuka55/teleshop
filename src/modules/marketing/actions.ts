"use server";

import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { sendEmail } from "@/lib/email/send";
import { reportError } from "@/lib/observability/report";
import { limitAction } from "@/lib/security/action-limit";
import { echoValues } from "@/lib/validation/form";
import { contactSchema, type ContactInput } from "./contact";
import { subscribeToNewsletter } from "./newsletter";
import { newsletterSchema } from "./schema";

export type ContactState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | {
      status: "error";
      message: string;
      fields?: Partial<Record<keyof ContactInput, string>>;
      values?: Record<string, string>;
    };

/** Contact form (P3-T07): parse → rate limit 5/min/IP → email support. */
export async function sendContactMessageAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    topic: formData.get("topic"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    const fields: Partial<Record<keyof ContactInput, string>> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0] as keyof ContactInput | undefined;
      if (k && !fields[k]) fields[k] = i.message;
    }
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fields,
      values: echoValues(formData),
    };
  }

  const limit = await limitAction("contact", 5);
  if (!limit.ok)
    return { status: "error", message: "Too many messages. Please wait a minute and try again." };

  const { name, email, phone, topic, message } = parsed.data;
  const result = await sendEmail({
    // the public address on the site is display-only; messages go to the real inbox
    to: env.CONTACT_INBOX ?? siteConfig.contact.email,
    replyTo: email,
    subject: `[Contact · ${topic}] ${name}`,
    text: `${message}\n\n— ${name} <${email}>${phone ? ` · ${phone}` : ""}`,
  });
  if (!result.sent && result.reason === "failed") {
    return {
      status: "error",
      message: `We couldn’t send your message. Email us at ${siteConfig.contact.email}.`,
    };
  }
  if (!result.sent && env.NODE_ENV === "production") {
    return { status: "error", message: `Messaging is unavailable. Email us at ${siteConfig.contact.email}.` };
  }
  return { status: "ok", message: "Thanks — we’ll reply within one working day." };
}

export type NewsletterState =
  { status: "idle" } | { status: "ok"; message: string } | { status: "error"; message: string };

/**
 * Newsletter sign-up: parse (Zod) → rate limit (5/min/IP) → store in `newsletter_subscribers`.
 * Same answer whether the address is new or already subscribed (no enumeration).
 */
export async function subscribeNewsletterAction(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = newsletterSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid email address" };
  }

  const limit = await limitAction("newsletter", 5);
  if (!limit.ok) return { status: "error", message: "Too many attempts. Please try again in a minute." };

  try {
    await subscribeToNewsletter(parsed.data.email);
  } catch (error) {
    await reportError(error, { source: "server", tags: { action: "newsletter.subscribe" } });
    return { status: "error", message: "We couldn’t sign you up just now. Please try again in a moment." };
  }
  return { status: "ok", message: "Thanks! You’re on the list for the next deal drop." };
}
