import "server-only";
import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { sendEmail, type SendResult } from "@/lib/email/send";

/** Plain-text auth emails. Links carry the raw token; the database only has its hash. */

function link(path: string, token: string): string {
  return `${siteConfig.url}${path}?token=${encodeURIComponent(token)}`;
}

/**
 * Without SMTP in development the link is printed to the server console so the flow can be
 * tested locally. Never in production — there a missing SMTP config just means no email.
 */
async function deliver(to: string, subject: string, text: string, devLink: string): Promise<SendResult> {
  const result = await sendEmail({ to, subject, text });
  if (!result.sent && env.NODE_ENV === "development") {
    console.info(`[dev] ${subject} — ${devLink}`);
  }
  return result;
}

export function sendVerificationEmail(to: string, name: string, token: string): Promise<SendResult> {
  const url = link("/verify-email", token);
  return deliver(
    to,
    "Verify your email for Teleshop",
    `Hi ${name},\n\nWelcome to Teleshop! Please confirm your email address:\n\n${url}\n\nThe link works once and expires in 24 hours. If you didn't create an account, ignore this email.\n\n— Teleshop`,
    url,
  );
}

/** Someone tried to register with an email that already has an account (no enumeration on screen). */
export function sendAlreadyRegisteredEmail(to: string, name: string): Promise<SendResult> {
  const url = `${siteConfig.url}/sign-in`;
  return deliver(
    to,
    "You already have a Teleshop account",
    `Hi ${name},\n\nSomeone (hopefully you) tried to create a Teleshop account with this email, but you already have one.\n\nSign in: ${url}\nForgot your password? ${siteConfig.url}/forgot-password\n\n— Teleshop`,
    url,
  );
}

export function sendPasswordResetEmail(to: string, name: string, token: string): Promise<SendResult> {
  const url = link("/reset-password", token);
  return deliver(
    to,
    "Reset your Teleshop password",
    `Hi ${name},\n\nUse this link to choose a new password:\n\n${url}\n\nThe link works once and expires in 30 minutes. Choosing a new password signs you out on every device. If you didn't ask for this, ignore this email — your password stays the same.\n\n— Teleshop`,
    url,
  );
}
