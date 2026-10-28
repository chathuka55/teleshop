import "server-only";
import { siteConfig } from "@/config/site";
import { sendEmail, type SendResult } from "@/lib/email/send";

/** The shop accepted its package (P6-T04). */
export function sendPackageConfirmedEmail(
  to: string,
  name: string,
  orderNo: string,
  shopName: string,
): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `Good news — ${shopName} has confirmed your items in order ${orderNo} and is preparing them.`,
    "We'll send the courier tracking code as soon as the package is handed over.",
    "",
    `Order details: ${siteConfig.url}/account/orders/${orderNo}`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `${shopName} confirmed your order ${orderNo}`, text });
}

/** The shop could not fulfil its package. Nothing is due for it (Cash on Delivery). */
export function sendPackageCancelledByShopEmail(
  to: string,
  name: string,
  orderNo: string,
  shopName: string,
  reason: string,
  items: readonly { name: string; qty: number }[],
): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `Sorry — ${shopName} couldn't fulfil part of your order ${orderNo} and has cancelled it.`,
    `Reason: ${reason}`,
    "",
    ...items.map((i) => `  ${i.qty} × ${i.name}`),
    "",
    "You won't be asked to pay for these items. Other shops' packages in this order are not affected.",
    "",
    `Order details: ${siteConfig.url}/account/orders/${orderNo}`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `Part of order ${orderNo} was cancelled by ${shopName}`, text });
}
