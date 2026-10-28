import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Mail, MapPin, Phone, ScanBarcode, Store } from "lucide-react";
import { PackageAdminActions } from "@/components/admin/PackageAdminActions";
import { TrackingPanel } from "@/components/admin/TrackingPanel";
import { orderStatusLabel } from "@/components/orders/order-status";
import { PackageTimeline } from "@/components/orders/PackageTimeline";
import { TrackingCodeBox } from "@/components/orders/TrackingCodeBox";
import { sellerPackageStatus } from "@/components/seller/seller-status";
import { Badge } from "@/components/ui/Badge";
import { formatLKR } from "@/lib/utils/money";
import { formatPhoneLK } from "@/lib/utils/strings";
import { orderNo as orderNoSchema } from "@/lib/validation/common";
import { adminCouriers, adminOrder } from "@/modules/admin/session";

type Props = { params: Promise<{ orderNo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `${(await params).orderNo} — Admin`, robots: { index: false } };
}

const payTone = { pending: "accent", paid: "success", failed: "danger", refunded: "neutral" } as const;

/** Figma "A4 · Admin — Order Detail" with the Courier & Tracking panel per package (P7-T02). */
export default async function AdminOrderPage({ params }: Props) {
  const parsed = orderNoSchema.safeParse((await params).orderNo);
  if (!parsed.success) notFound();
  const [order, couriers] = await Promise.all([adminOrder(parsed.data), adminCouriers()]);
  if (!order) notFound();
  const s = orderStatusLabel[order.status];
  const a = order.address;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] text-text-secondary">
          <Link href="/admin/orders" className="hover:text-text">
            Orders
          </Link>{" "}
          / {order.orderNo}
        </p>
        <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          {order.orderNo}
          <Badge tone={s.tone}>{s.label}</Badge>
          {order.payment && <Badge tone={payTone[order.payment.status]}>COD {order.payment.status}</Badge>}
        </h1>
        <p className="text-sm text-text-secondary">
          Placed{" "}
          {new Date(order.placedAt).toLocaleString("en-LK", {
            timeZone: "Asia/Colombo",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          · {order.deliveryMethod === "express" ? "Express" : "Standard"} delivery
          {order.cancelReason && ` · ${order.cancelReason}`}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-[20px] border border-line bg-surface p-5 text-sm md:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <MapPin aria-hidden className="size-5 text-primary-light" /> Deliver to
          </h2>
          <address className="text-text-secondary not-italic">
            <span className="font-semibold text-text">{a.recipientName}</span>
            <br />
            {a.line1}
            {a.line2 && `, ${a.line2}`}, {a.city}, {a.district}
            {a.postalCode && ` ${a.postalCode}`}
          </address>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary-light">
              <Phone aria-hidden className="size-4" /> {formatPhoneLK(a.phone)}
            </a>
            {order.customer && (
              <a
                href={`mailto:${order.customer.email}`}
                className="inline-flex items-center gap-1.5 hover:text-primary-light"
              >
                <Mail aria-hidden className="size-4" /> {order.customer.email}
              </a>
            )}
          </p>
        </section>
        <section className="rounded-[20px] border border-line bg-surface p-5 text-sm">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <Banknote aria-hidden className="size-5 text-success" /> COD
          </h2>
          <dl className="flex flex-col gap-1">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Items</dt>
              <dd>{formatLKR(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Delivery</dt>
              <dd>{formatLKR(order.deliveryCents)}</dd>
            </div>
            <div className="mt-1 flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatLKR(order.totalCents)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {order.packages.map((p, i) => {
        const ps = sellerPackageStatus[p.status];
        const amount = p.subtotalCents + p.deliveryCents;
        return (
          <section
            key={p.id}
            id={`pkg-${p.id}`}
            className="flex scroll-mt-28 flex-col gap-4 rounded-[20px] border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Store aria-hidden className="size-5 text-primary-light" /> Package {i + 1} · {p.sellerName}
              </h2>
              <Badge tone={ps.tone}>{ps.label}</Badge>
              {p.payment && (
                <Badge tone={payTone[p.payment.status]} size="xs">
                  {formatLKR(amount)} {p.payment.status}
                </Badge>
              )}
              <a
                href={`tel:${p.sellerPhone}`}
                className="ml-auto text-[13px] text-text-secondary hover:text-text"
              >
                Shop: {p.sellerPhone ? formatPhoneLK(p.sellerPhone) : "—"}
              </a>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {p.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span>
                    {item.qty} × <span className="font-semibold">{item.name}</span>{" "}
                    <span className="text-text-secondary">({item.variantLabel})</span>
                    {item.serialNumbers.length > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-text-secondary">
                        <ScanBarcode aria-hidden className="size-3.5" />
                        <span className="font-mono">{item.serialNumbers.join(", ")}</span>
                      </span>
                    )}
                  </span>
                  <span>{formatLKR(item.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            {p.shipment && <TrackingCodeBox shipment={p.shipment} />}
            <TrackingPanel orderNo={order.orderNo} packageId={p.id} status={p.status} couriers={couriers} />
            <PackageAdminActions
              orderNo={order.orderNo}
              packageId={p.id}
              status={p.status}
              amountCents={amount}
            />
            <details className="border-t border-line pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-text-secondary hover:text-text">
                History
              </summary>
              <div className="mt-3">
                <PackageTimeline
                  entries={order.timeline.filter((e) => !e.packageId || e.packageId === p.id)}
                />
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
