import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/config/env";

export type SendResult = { sent: true } | { sent: false; reason: "not_configured" | "failed" };

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

/** Sends a plain-text email via SMTP (EMAIL_SERVER). Never logs recipients or bodies (docs/10). */
export async function sendEmail(msg: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  if (!env.EMAIL_SERVER || !env.EMAIL_FROM) return { sent: false, reason: "not_configured" };
  transport ??= nodemailer.createTransport(env.EMAIL_SERVER);
  try {
    await transport.sendMail({ from: env.EMAIL_FROM, ...msg });
    return { sent: true };
  } catch {
    return { sent: false, reason: "failed" };
  }
}
