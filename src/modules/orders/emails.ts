import "server-only";
import { siteConfig } from "@/config/site";
import { sendEmail, type SendResult } from "@/lib/email/send";
import { formatLKR } from "@/lib/utils/money";
import type { AddressDTO } from "@/modules/addresses/types";
import type { PricedCartDTO } from "@/modules/cart/types";

/** Plain-text order confirmation (P4-T05). No card or payment data exists to leak — COD only. */
export function sendOrderConfirmationEmail(
  to: string,
  name: string,
  orderNo: string,
  cart: PricedCartDTO,
  address: AddressDTO,
): Promise<SendResult> {
  const lines = cart.packages.flatMap((p) => [
    `From ${p.seller.shopName}:`,
    ...p.lines.map((l) => `  ${l.qty} × ${l.name} (${l.variantLabel}) — ${formatLKR(l.lineTotalCents)}`),
    `  Delivery: ${p.deliveryCents ? formatLKR(p.deliveryCents) : "Free"}`,
  ]);
  const text = [
    `Hi ${name},`,
    "",
    `Thank you! Your order ${orderNo} has been placed. You'll pay in cash when each package arrives.`,
    "",
    ...lines,
    "",
    `Total to pay on delivery: ${formatLKR(cart.totalCents)}`,
    "",
    "Delivering to:",
    `  ${address.recipientName}, ${address.line1}${address.line2 ? `, ${address.line2}` : ""}, ${address.city}`,
    "",
    `Track your order: ${siteConfig.url}/account/orders/${orderNo}`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `Order ${orderNo} confirmed — Cash on Delivery`, text });
}

/** Confirms the customer's own cancellation (P5-T04). */
export function sendOrderCancelledEmail(
  to: string,
  name: string,
  orderNo: string,
  reason: string,
): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `Your order ${orderNo} has been cancelled. Nothing is due — Cash on Delivery orders are only paid on delivery.`,
    "",
    `Reason: ${reason}`,
    "",
    `Order details: ${siteConfig.url}/account/orders/${orderNo}`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `Order ${orderNo} cancelled`, text });
}

/** Tells a shop to stop preparing its package. The customer's address is not included. */
export function sendSellerPackageCancelledEmail(
  to: string,
  shopName: string,
  orderNo: string,
  items: readonly { name: string; qty: number }[],
): Promise<SendResult> {
  const text = [
    `Hi ${shopName},`,
    "",
    `The customer cancelled order ${orderNo}. Please stop preparing this package — the stock`,
    "has been released back to your listings automatically.",
    "",
    ...items.map((i) => `  ${i.qty} × ${i.name}`),
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `Order ${orderNo} cancelled by the customer`, text });
}

/** Tells a shop it has a new package to accept. Amounts are the shop's own package only. */
export function sendSellerNewOrderEmail(
  to: string,
  shopName: string,
  orderNo: string,
  items: readonly { name: string; variantLabel: string; qty: number }[],
  amountCents: number,
): Promise<SendResult> {
  const text = [
    `Hi ${shopName},`,
    "",
    `You have a new Cash on Delivery order: ${orderNo}.`,
    "",
    ...items.map((i) => `  ${i.qty} × ${i.name} (${i.variantLabel})`),
    "",
    `Courier collects: ${formatLKR(amountCents)}`,
    "",
    `Accept it in your seller dashboard: ${siteConfig.url}/seller/orders/${orderNo}`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `New order ${orderNo} — please accept`, text });
}

/** The shop didn't accept in time, so Teleshop cancelled its package (auto-cancel job). */
export function sendPackageAutoCancelledEmail(
  to: string,
  name: string,
  orderNo: string,
  shopName: string,
  hours: number,
  items: readonly { name: string; qty: number }[],
): Promise<SendResult> {
  const text = [
    `Hi ${name},`,
    "",
    `Sorry — ${shopName} didn't confirm part of your order ${orderNo} within ${hours} hours, so we`,
    "cancelled it rather than keep you waiting:",
    "",
    ...items.map((i) => `  ${i.qty} × ${i.name}`),
    "",
    "You won't be asked to pay for these items. Other shops' packages in this order are not affected.",
    "",
    `Order details: ${siteConfig.url}/account/orders/${orderNo}`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `Part of order ${orderNo} was cancelled`, text });
}

/** Tells a shop its unaccepted package was cancelled automatically and the stock released. */
export function sendSellerPackageAutoCancelledEmail(
  to: string,
  shopName: string,
  orderNo: string,
  hours: number,
  items: readonly { name: string; qty: number }[],
): Promise<SendResult> {
  const text = [
    `Hi ${shopName},`,
    "",
    `Order ${orderNo} wasn't accepted within ${hours} hours, so Teleshop cancelled your package and`,
    "told the customer. The stock is back on sale in your listings:",
    "",
    ...items.map((i) => `  ${i.qty} × ${i.name}`),
    "",
    `Please accept new orders in time: ${siteConfig.url}/seller/orders`,
    "",
    "— Teleshop",
  ].join("\n");
  return sendEmail({ to, subject: `Order ${orderNo} cancelled — not accepted in time`, text });
}
