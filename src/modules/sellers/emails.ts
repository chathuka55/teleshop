import "server-only";
import { siteConfig } from "@/config/site";
import { sendEmail, type SendResult } from "@/lib/email/send";

/** Confirms a seller application was received (P6-T01). */
export function sendShopApplicationEmail(to: string, name: string, shopName: string): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `Thanks for applying to sell on Teleshop as ${shopName}.`,
    "We check every shop's business registration and usually reply within 24 hours.",
    "",
    `See the status any time: ${siteConfig.url}/register/seller`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `We received your shop application — ${shopName}`, text });
}
