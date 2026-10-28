import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, CircleCheck, CircleX, MapPin, Store, Truck } from "lucide-react";
import { CancelOrderForm } from "@/components/orders/CancelOrderForm";
import { orderStatusLabel, packageStatusLabel } from "@/components/orders/order-status";
import { PackageTimeline } from "@/components/orders/PackageTimeline";
import { StatusStepper } from "@/components/orders/StatusStepper";
import { TrackingCodeBox } from "@/components/orders/TrackingCodeBox";
import { ProductArt } from "@/components/product/ProductArt";
import { Stars } from "@/components/product/Rating";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { Badge } from "@/components/ui/Badge";
import { formatLKR } from "@/lib/utils/money";
import { formatPhoneLK } from "@/lib/utils/strings";
import { orderNo as orderNoSchema } from "@/lib/validation/common";
import { getMyOrder } from "@/modules/orders/customer";

type Props = { params: Promise<{ orderNo: string }>; searchParams: Promise<{ placed?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order ${(await params).orderNo}`, robots: { index: false } };
}

/** Figma "13 · Order Details" — also the confirmation page right after checkout (?placed=1). */
export default async function OrderPage({ params, searchParams }: Props) {
  const parsed = orderNoSchema.safeParse((await params).orderNo);
  if (!parsed.success) notFound();
  const order = await getMyOrder(parsed.data);
  // Also for other customers' orders — the page gives no hint that the order exists.
  if (!order) notFound();
  // The thank-you banner only makes sense while the order is still live.
  const placed = (await searchParams).placed === "1" && order.status !== "cancelled";
  const status = orderStatusLabel[order.status];
  const a = order.deliveryAddress;

  return (
    <div className="flex flex-col gap-5">
      {placed && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[20px] border border-success/35 bg-success/10 p-5"
        >
          <CircleCheck aria-hidden className="size-6 shrink-0 text-success" />
          <div>
            <p className="font-display text-lg font-bold">Thank you — your order is placed!</p>
            <p className="text-sm text-text-secondary">
              We&apos;ve emailed the details. Each shop confirms and packs its own package; you pay in cash
              when it arrives.
            </p>
          </div>
        </div>
      )}

      {order.status === "cancelled" && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[20px] border border-danger/30 bg-danger/8 p-5"
        >
          <CircleX aria-hidden className="size-6 shrink-0 text-danger" />
          <div>
            <p className="font-display text-lg font-bold">This order is cancelled</p>
            <p className="text-sm text-text-secondary">
              {order.cancelledAt &&
                `Cancelled ${new Date(order.cancelledAt).toLocaleString("en-LK", {
                  timeZone: "Asia/Colombo",
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}. `}
              {order.cancelReason && `Reason: ${order.cancelReason}. `}
              Nothing is due.
            </p>
          </div>
        </div>
      )}

      <header>
        <p className="text-[13px] text-text-secondary">
          <Link href="/account/orders" className="hover:text-text">
            My orders
          </Link>{" "}
          / {order.orderNo}
        </p>
        <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          {order.orderNo}
          <Badge tone={status.tone}>{status.label}</Badge>
        </h1>
        <p className="text-sm text-text-secondary">
          Placed{" "}
          {new Date(order.placedAt).toLocaleString("en-LK", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        {order.canCancel && (
          <div className="mt-4">
            <CancelOrderForm orderNo={order.orderNo} />
          </div>
        )}
      </header>

      {order.packages.map((p, i) => (
        <section key={p.id} className="rounded-[20px] border border-line bg-surface p-5">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-lg font-bold">
            <Store aria-hidden className="size-5 text-primary-light" />
            Package {i + 1} ·{" "}
            {p.sellerSlug ? (
              <Link href={`/s/${p.sellerSlug}`} className="hover:text-primary-light">
                {p.sellerName}
              </Link>
            ) : (
              p.sellerName
            )}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">{packageStatusLabel[p.status]}</p>
          {p.status !== "cancelled" && p.status !== "returned" && (
            <div className="mt-4">
              <StatusStepper status={p.status} />
            </div>
          )}
          {p.shipment && (
            <div className="mt-4">
              <TrackingCodeBox shipment={p.shipment} />
            </div>
          )}
          <ul className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
            {p.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 text-sm">
                <ProductArt
                  product={{ art: { kind: "phone", tint: "blue" }, imageUrl: item.imageUrl, name: item.name }}
                  size="sm"
                  artScale={0.4}
                  className="size-14 shrink-0 rounded-xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 font-semibold">{item.name}</span>
                  <span className="text-xs text-text-secondary">
                    {item.variantLabel} · {item.qty} × {formatLKR(item.unitPriceCents)}
                  </span>
                </span>
                <span className="font-semibold">{formatLKR(item.lineTotalCents)}</span>
                {item.serialNumbers.length > 0 && (
                  <span className="w-full pl-[68px] text-xs text-text-secondary">
                    IMEI / serial:{" "}
                    <span className="font-mono text-text">{item.serialNumbers.join(", ")}</span>
                  </span>
                )}
                {item.myRating !== null && (
                  <span className="flex w-full items-center gap-2 pl-[68px] text-xs text-text-secondary">
                    <Stars value={item.myRating} /> You reviewed this item
                    {item.productSlug && (
                      <Link
                        href={`/p/${item.productSlug}#reviews`}
                        className="text-primary-light hover:text-text"
                      >
                        See it
                      </Link>
                    )}
                  </span>
                )}
                {item.canReview && (
                  <div className="w-full pl-[68px]">
                    <ReviewForm orderNo={order.orderNo} itemId={item.id} itemName={item.name} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between text-sm text-text-secondary">
            <span>Delivery</span>
            <span>{p.deliveryCents ? formatLKR(p.deliveryCents) : "Free"}</span>
          </p>
          {p.timeline.length > 0 && (
            <details className="group mt-4 border-t border-line pt-4" open={p.timeline.length <= 4}>
              <summary className="cursor-pointer text-sm font-semibold text-text-secondary marker:text-text-muted hover:text-text">
                Package history
              </summary>
              <div className="mt-3">
                <PackageTimeline entries={p.timeline} />
              </div>
            </details>
          )}
        </section>
      ))}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[20px] border border-line bg-surface p-5 text-sm">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <MapPin aria-hidden className="size-5 text-primary-light" /> Delivery
          </h2>
          <address className="text-text-secondary not-italic">
            {a.recipientName}
            <br />
            {a.line1}
            {a.line2 && `, ${a.line2}`}
            <br />
            {a.city}, {a.district}
            <br />
            {formatPhoneLK(a.phone)}
          </address>
          <p className="mt-3 flex items-center gap-2 text-text-secondary">
            <Truck aria-hidden className="size-4" />
            {order.deliveryMethod === "express" ? "Express delivery" : "Standard delivery"}
          </p>
        </section>
        <section className="rounded-[20px] border border-line bg-surface p-5 text-sm">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <Banknote aria-hidden className="size-5 text-success" /> Cash on Delivery
          </h2>
          <dl className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Subtotal</dt>
              <dd>{formatLKR(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Delivery</dt>
              <dd>{order.deliveryCents ? formatLKR(order.deliveryCents) : "Free"}</dd>
            </div>
            <div className="mt-1 flex justify-between font-display text-lg font-bold">
              <dt>To pay on delivery</dt>
              <dd>{formatLKR(order.totalCents)}</dd>
            </div>
          </dl>
          {order.packages.length > 1 && (
            <p className="mt-2 text-xs text-text-muted">
              Paid per package: each courier collects only its own package&apos;s amount.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
