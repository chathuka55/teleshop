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
