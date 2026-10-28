import "server-only";
import { siteConfig } from "@/config/site";
import { sendEmail, type SendResult } from "@/lib/email/send";
import { formatLKR } from "@/lib/utils/money";

/** Customer emails sent when an admin moves a package (P7-T02). Plain text, no personal data beyond the name. */

const orderLink = (orderNo: string): string => `${siteConfig.url}/account/orders/${orderNo}`;

export function sendShippedEmail(
  to: string,
  name: string,
  orderNo: string,
  p: {
    shopName: string;
    courierName: string;
    trackingCode: string;
    trackingUrl: string;
    amountCents: number;
  },
): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `Your package from ${p.shopName} (order ${orderNo}) is on its way with ${p.courierName}.`,
    "",
    `Tracking code: ${p.trackingCode}`,
    `Track it: ${p.trackingUrl}`,
    "",
    `Please have ${formatLKR(p.amountCents)} ready for the courier (Cash on Delivery).`,
    "Check the seal before you pay — you can refuse a damaged package.",
    "",
    `Order details: ${orderLink(orderNo)}`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `Shipped: order ${orderNo} — tracking ${p.trackingCode}`, text });
}

export function sendDeliveredEmail(
  to: string,
  name: string,
  orderNo: string,
  shopName: string,
): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `Your package from ${shopName} (order ${orderNo}) was delivered and paid. Thank you for shopping on Teleshop!`,
    "",
    `How was it? You can review each item on your order page: ${orderLink(orderNo)}`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `Delivered: order ${orderNo}`, text });
}

export function sendReturnedEmail(
  to: string,
  name: string,
  orderNo: string,
  shopName: string,
  note: string,
): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `The courier couldn't deliver your package from ${shopName} (order ${orderNo}) and is returning it to the shop.`,
    note ? `Note: ${note}` : "",
    "",
    "Nothing is due for this package. If you still want it, you're welcome to order again.",
    "",
    `Order details: ${orderLink(orderNo)}`,
    "",
    "— Teleshop",
  ]
    .filter((l, i, all) => l !== "" || all[i - 1] !== "")
    .join("\n");
  return sendEmail({ to, subject: `Not delivered: order ${orderNo}`, text });
}

export function sendCancelledByTeleshopEmail(
  to: string,
  name: string,
  orderNo: string,
  shopName: string,
  reason: string,
): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `We had to cancel your package from ${shopName} in order ${orderNo}.`,
    reason ? `Reason: ${reason}` : "",
    "",
    "Nothing is due for it. Sorry for the trouble — other packages in the order are not affected.",
    "",
    `Order details: ${orderLink(orderNo)}`,
    "",
    "— Teleshop",
  ]
    .filter((l, i, all) => l !== "" || all[i - 1] !== "")
    .join("\n");
  return sendEmail({ to, subject: `Cancelled: part of order ${orderNo}`, text });
}

export function sendShopPackageCancelledByTeleshopEmail(
  to: string,
  shopName: string,
  orderNo: string,
  reason: string,
): Promise<SendResult> {
  const text = [
    `Hi ${shopName},`,
    "",
    `Teleshop cancelled your package in order ${orderNo}. Please stop preparing it — the stock has been released.`,
    reason ? `Reason: ${reason}` : "",
    "",
    "— Teleshop",
  ]
    .filter((l, i, all) => l !== "" || all[i - 1] !== "")
    .join("\n");
  return sendEmail({ to, subject: `Order ${orderNo} cancelled by Teleshop`, text });
}
