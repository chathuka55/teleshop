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
