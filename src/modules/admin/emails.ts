import "server-only";
import { siteConfig } from "@/config/site";
import { sendEmail, type SendResult } from "@/lib/email/send";
import { formatLKR } from "@/lib/utils/money";

/** Emails to shop owners about admin decisions (P7). Plain text. */

export function sendShopApprovedEmail(to: string, name: string, shopName: string): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `Good news — ${shopName} is approved and can now sell on Teleshop.`,
    "Sign in and open the seller dashboard to add products, set your stock and receive orders.",
    "(If you were already signed in, the dashboard appears within a few minutes.)",
    "",
    `Seller dashboard: ${siteConfig.url}/seller`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `${shopName} is approved — welcome to Teleshop`, text });
}

export function sendShopRejectedEmail(
  to: string,
  name: string,
  shopName: string,
  reason: string,
): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `We couldn't approve ${shopName} yet.`,
    `Reason: ${reason}`,
    "",
    `You can fix the details and apply again here: ${siteConfig.url}/register/seller`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `Your shop application — ${shopName}`, text });
}

export function sendProductDecisionEmail(
  to: string,
  shopName: string,
  product: { id: string; name: string },
  decision: "approved" | "returned" | "blocked",
  note: string,
): Promise<SendResult> {
  const lead = {
    approved: `"${product.name}" is approved and on sale now.`,
    returned: `"${product.name}" needs a few changes before it can go on sale. It's back in your drafts.`,
    blocked: `"${product.name}" was removed from Teleshop and can't be sold.`,
  }[decision];
  const text = [
    `Hi ${shopName},`,
    "",
    lead,
    note ? `Note from Teleshop: ${note}` : "",
    "",
    `Open the product: ${siteConfig.url}/seller/products/${product.id}`,
    "",
    "— Teleshop",
  ]
    .filter((l, i, all) => l !== "" || all[i - 1] !== "")
    .join("\n");
  const subject = { approved: "Approved", returned: "Changes needed", blocked: "Removed" }[decision];
  return sendEmail({ to, subject: `${subject}: ${product.name}`, text });
}

export function sendShopSuspendedEmail(
  to: string,
  name: string,
  shopName: string,
  reason: string,
): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `${shopName} is suspended on Teleshop. Your products are hidden from the store until this is resolved.`,
    `Reason: ${reason}`,
    "",
    "Please reply to this email or contact support to sort it out.",
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `${shopName} is suspended`, text });
}

export function sendShopReinstatedEmail(to: string, name: string, shopName: string): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `${shopName} is active again — your products are back in the store.`,
    "",
    `Seller dashboard: ${siteConfig.url}/seller`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `${shopName} is active again`, text });
}

export function sendPayoutPaidEmail(
  to: string,
  shopName: string,
  netCents: number,
  reference: string,
  account: { bank: string; last4: string } | null,
): Promise<SendResult> {
  const text = [
    `Hi ${shopName},`,
    "",
    `We've paid ${formatLKR(netCents)} to your bank account${account ? ` (${account.bank}, ••••${account.last4})` : ""}.`,
    `Transfer reference: ${reference}`,
    "",
    `Details: ${siteConfig.url}/seller/payouts`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `Payout sent — ${formatLKR(netCents)}`, text });
}
