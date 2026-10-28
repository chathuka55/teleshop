import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Lock, MapPin, ScanBarcode, Zap } from "lucide-react";
import { PackageTimeline } from "@/components/orders/PackageTimeline";
import { StatusStepper } from "@/components/orders/StatusStepper";
import { TrackingCodeBox } from "@/components/orders/TrackingCodeBox";
import { ProductArt } from "@/components/product/ProductArt";
import { PackageActions } from "@/components/seller/PackageActions";
import { SerialForm } from "@/components/seller/SerialForm";
import { sellerPackageStatus } from "@/components/seller/seller-status";
import { Badge } from "@/components/ui/Badge";
import { formatLKR } from "@/lib/utils/money";
import { formatPhoneLK } from "@/lib/utils/strings";
import { orderNo as orderNoSchema } from "@/lib/validation/common";
import { canRecordSerials, missingSerials } from "@/modules/fulfilment/access";
import { getMyPackage } from "@/modules/fulfilment/seller";

type Props = { params: Promise<{ orderNo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order ${(await params).orderNo} — Seller`, robots: { index: false } };
}

/** Figma "S2 · Seller — Orders & Fulfilment" — one package (P6-T04). */
export default async function SellerOrderPage({ params }: Props) {
  const parsed = orderNoSchema.safeParse((await params).orderNo);
  if (!parsed.success) notFound();
  const pkg = await getMyPackage(parsed.data);
  // Another shop's order looks exactly like a missing one.
  if (!pkg) notFound();
  const s = sellerPackageStatus[pkg.status];
  const a = pkg.address;
  const missing = missingSerials(pkg.items);
  const editable = canRecordSerials(pkg.status);
  const live = pkg.status !== "cancelled" && pkg.status !== "returned";

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] text-text-secondary">
          <Link href="/seller/orders" className="hover:text-text">
            Orders
          </Link>{" "}
          / {pkg.orderNo}
        </p>
        <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          {pkg.orderNo}
          <Badge tone={s.tone}>{s.label}</Badge>
          {pkg.deliveryMethod === "express" && (
            <Badge tone="accent">
              <Zap aria-hidden className="size-3.5" /> Express
            </Badge>
          )}
        </h1>
        <p className="text-sm text-text-secondary">
          Placed{" "}
          {new Date(pkg.placedAt).toLocaleString("en-LK", {
            timeZone: "Asia/Colombo",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </header>

      {live && (
        <div className="rounded-[20px] border border-line bg-surface p-5">
          <StatusStepper status={pkg.status} />
        </div>
      )}

      {pkg.status === "cancelled" ? (
        <p className="rounded-[20px] border border-danger/30 bg-danger/8 p-5 text-sm text-text-secondary">
          {pkg.cancelReason ?? "This package was cancelled."} {s.next}
        </p>
      ) : (
        <PackageActions orderNo={pkg.orderNo} status={pkg.status} missingSerials={missing} />
      )}

      {pkg.shipment && <TrackingCodeBox shipment={pkg.shipment} />}

      <section className="rounded-[20px] border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Items</h2>
        <ul className="mt-3 flex flex-col">
          {pkg.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 border-t border-line py-4 first:border-0 first:pt-1"
            >
              <div className="flex items-center gap-3 text-sm">
                <ProductArt
                  product={{ art: { kind: "phone", tint: "blue" }, imageUrl: item.imageUrl, name: item.name }}
                  size="sm"
                  artScale={0.4}
                  className="size-14 shrink-0 rounded-xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 font-semibold">{item.name}</span>
                  <span className="text-xs text-text-secondary">
                    {item.variantLabel} · SKU {item.sku} · {item.qty} × {formatLKR(item.unitPriceCents)}
                  </span>
                </span>
                <span className="font-semibold">{formatLKR(item.lineTotalCents)}</span>
              </div>
              {editable && (item.requiresSerial || item.serialNumbers.length > 0) ? (
                <div className="sm:pl-[68px]">
                  <SerialForm
                    orderNo={pkg.orderNo}
                    itemId={item.id}
                    qty={item.qty}
                    saved={item.serialNumbers}
                    required={item.requiresSerial}
                  />
                </div>
              ) : (
                item.serialNumbers.length > 0 && (
                  <p className="flex flex-wrap items-center gap-2 text-xs text-text-secondary sm:pl-[68px]">
                    <ScanBarcode aria-hidden className="size-4" />
                    {item.serialNumbers.map((n) => (
                      <code key={n} className="rounded-md bg-white/6 px-1.5 py-0.5 font-mono text-text">
                        {n}
                      </code>
                    ))}
                  </p>
                )
              )}
              {item.requiresSerial && pkg.status === "confirmed" && (
                <p className="text-xs text-text-muted sm:pl-[68px]">
                  You can enter the numbers now or while packing — they&apos;re needed before ready to ship.
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[20px] border border-line bg-surface p-5 text-sm">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <MapPin aria-hidden className="size-5 text-primary-light" /> Deliver to
          </h2>
          <address className="text-text-secondary not-italic">
            {a.recipientName}
            <br />
            {a.line1 ? (
              <>
                {a.line1}
                {a.line2 && `, ${a.line2}`}
                <br />
                {a.city}, {a.district}
                {a.postalCode && ` ${a.postalCode}`}
                <br />
                {a.phone && formatPhoneLK(a.phone)}
              </>
            ) : (
              <>
                {a.city}, {a.district}
              </>
            )}
          </address>
          {!a.line1 && (
            <p className="mt-3 flex items-center gap-2 text-xs text-text-muted">
              <Lock aria-hidden className="size-3.5" /> The full address and phone appear once you accept.
            </p>
          )}
        </section>
        <section className="rounded-[20px] border border-line bg-surface p-5 text-sm">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <Banknote aria-hidden className="size-5 text-success" /> Cash on Delivery
          </h2>
          <dl className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Items</dt>
              <dd>{formatLKR(pkg.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Delivery</dt>
              <dd>{pkg.deliveryCents ? formatLKR(pkg.deliveryCents) : "Free"}</dd>
            </div>
            <div className="mt-1 flex justify-between font-display text-lg font-bold">
              <dt>Courier collects</dt>
              <dd>{formatLKR(pkg.amountCents)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {pkg.timeline.length > 0 && (
        <section className="rounded-[20px] border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-lg font-bold">History</h2>
          <PackageTimeline entries={pkg.timeline} />
        </section>
      )}
    </div>
  );
}
