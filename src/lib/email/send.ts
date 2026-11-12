import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/config/env";
import { logger } from "@/lib/observability/logger";

export type SendResult = { sent: true } | { sent: false; reason: "not_configured" | "failed" };

type Message = { to: string; subject: string; text: string; replyTo?: string };

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 10_000;

/** "Teleshop <shop@example.com>" → { name, email }. A bare address works too. */
export function parseSender(from: string): { name?: string; email: string } | null {
  const s = from.trim();
  let email = s;
  let name: string | undefined;
  if (s.endsWith(">") && s.includes("<")) {
    const i = s.lastIndexOf("<");
    email = s.slice(i + 1, -1).trim();
    name = s.slice(0, i).trim().replace(/^"|"$/g, "").trim() || undefined;
  }
  return /^[^\s@<>"]+@[^\s@<>"]+$/.test(email) ? { ...(name ? { name } : {}), email } : null;
}

/** Brevo SMTP relay URL from the SMTP login ("…@smtp-brevo.com") and an SMTP key ("xsmtpsib-…"). */
export function brevoSmtpUrl(login: string, smtpKey: string): string {
  return `smtp://${encodeURIComponent(login)}:${encodeURIComponent(smtpKey)}@smtp-relay.brevo.com:587`;
}

/** EMAIL_SERVER has to be a URL ("smtp://login:key@smtp-relay.brevo.com:587"), not a bare key. */
export function isSmtpUrl(value: string): boolean {
  return /^smtps?:\/\/[^\s]+$/.test(value);
}

/**
 * Sends a plain-text email. Order: Brevo HTTP API (BREVO_API_KEY "xkeysib-…") or Brevo SMTP relay
 * (BREVO_API_KEY "xsmtpsib-…" + BREVO_SMTP_LOGIN) → SMTP (EMAIL_SERVER) → not sent.
 * The HTTP API suits serverless better than SMTP (no socket set-up per cold start).
 * Never logs recipients or bodies (docs/10) — only the transport and the failure status.
 */
export async function sendEmail(msg: Message): Promise<SendResult> {
  const sender = env.EMAIL_FROM ? parseSender(env.EMAIL_FROM) : null;
  if (!sender) return notConfigured("EMAIL_FROM missing or not an email address");
  const key = env.BREVO_API_KEY;
  if (key?.startsWith("xsmtpsib-")) {
    // A Brevo SMTP key (not an API key): send over Brevo's SMTP relay with the account's SMTP login.
    if (!env.BREVO_SMTP_LOGIN) return notConfigured("BREVO_API_KEY is an SMTP key: set BREVO_SMTP_LOGIN too");
    return sendViaSmtp(brevoSmtpUrl(env.BREVO_SMTP_LOGIN, key), env.EMAIL_FROM!, msg);
  }
  if (key) return sendViaBrevo(key, sender, msg);
  if (env.EMAIL_SERVER) {
    if (!isSmtpUrl(env.EMAIL_SERVER)) return notConfigured("EMAIL_SERVER is not an smtp:// URL");
    return sendViaSmtp(env.EMAIL_SERVER, env.EMAIL_FROM!, msg);
  }
  return { sent: false, reason: "not_configured" };
}

let warned = false;
function notConfigured(why: string): SendResult {
  if (!warned) {
    warned = true;
    logger.warn("email.not_configured", { why });
  }
  return { sent: false, reason: "not_configured" };
}

async function sendViaBrevo(
  apiKey: string,
  sender: { name?: string; email: string },
  msg: Message,
): Promise<SendResult> {
  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender,
        to: [{ email: msg.to }],
        subject: msg.subject,
        textContent: msg.text,
        ...(msg.replyTo ? { replyTo: { email: msg.replyTo } } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.ok) return { sent: true };
    // Brevo's error body has a code + message (e.g. "unauthorized", sender not validated) — no PII.
    const body = (await res.json().catch(() => null)) as { code?: unknown; message?: unknown } | null;
    logger.error("email.send_failed", {
      transport: "brevo",
      status: res.status,
      code: typeof body?.code === "string" ? body.code : undefined,
      message: typeof body?.message === "string" ? body.message.slice(0, 200) : undefined,
    });
    return { sent: false, reason: "failed" };
  } catch (e) {
    logger.error("email.send_failed", { transport: "brevo", error: e instanceof Error ? e.name : "unknown" });
    return { sent: false, reason: "failed" };
  }
}

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

async function sendViaSmtp(url: string, from: string, msg: Message): Promise<SendResult> {
  transport ??= nodemailer.createTransport(url);
  try {
    await transport.sendMail({ from, ...msg });
    return { sent: true };
  } catch (e) {
    logger.error("email.send_failed", {
      transport: "smtp",
      error: e instanceof Error ? e.name : "unknown",
      code: (e as { code?: unknown }).code,
    });
    return { sent: false, reason: "failed" };
  }
}
