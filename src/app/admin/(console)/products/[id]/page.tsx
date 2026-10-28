import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { productStatus } from "@/components/seller/products/product-status";
import { Badge } from "@/components/ui/Badge";
import { formatLKR } from "@/lib/utils/money";
import { objectId } from "@/lib/validation/common";
import { adminProduct } from "@/modules/admin/session";

export const metadata: Metadata = { title: "Product review — Admin", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

/** Figma "A6 · Admin — Product review" (P7-T03): everything the buyer would see, then a decision. */
export default async function AdminProductPage({ params }: Props) {
  const id = objectId.safeParse((await params).id);
  if (!id.success) notFound();
  const p = await adminProduct(id.data);
  if (!p) notFound();
  const s = productStatus[p.status];
  const allowed =
    p.status === "pending_review" ? ["approve", "return", "block"] : p.status === "blocked" ? [] : ["block"];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] text-text-secondary">
          <Link href={`/admin/products?status=${p.status}`} className="hover:text-text">
            Products
          </Link>{" "}
          / {p.shortName}
        </p>
        <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          {p.name}
          <Badge tone={s.tone}>{s.label}</Badge>
        </h1>
        <p className="text-sm text-text-secondary">
          {p.shopName} · {p.categoryName} · {p.brandName} · {p.condition}
          {p.status === "pending_review" &&
            (p.wasPublished ? " · re-review after a price change over 20 %" : " · new listing")}
        </p>
        {p.status === "published" && (
          <Link href={`/p/${p.slug}`} className="text-sm font-semibold text-primary-light hover:text-text">
            Open in the store →
          </Link>
        )}
      </header>

      {p.moderationNote && (
        <p className="rounded-[20px] border border-accent/30 bg-accent/8 px-4 py-3 text-sm">
          Last note: {p.moderationNote}
        </p>
      )}

      <section className="rounded-[20px] border border-line bg-surface p-5">
        {p.images.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.images.map((src) => (
              <li
                key={src}
                className="relative aspect-square overflow-hidden rounded-xl border border-line bg-white/4"
              >
                <Image src={src} alt="" fill sizes="200px" className="object-contain p-2" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-accent">No photos.</p>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[20px] border border-line bg-surface p-5 text-sm">
          <h2 className="mb-2 font-display text-lg font-bold">Variants</h2>
          <ul className="flex flex-col gap-1.5">
            {p.variants.map((v) => (
              <li key={v.sku} className="flex justify-between gap-3">
                <span>
                  {v.label} <span className="font-mono text-xs text-text-muted">{v.sku}</span>
                  {!v.isActive && <span className="text-text-muted"> · off</span>}
                </span>
                <span>
                  {formatLKR(v.priceCents)}
                  {v.compareAtCents && (
                    <s className="ml-1.5 text-text-muted">{formatLKR(v.compareAtCents)}</s>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-text-secondary">
            Warranty:{" "}
            {p.warranty.type === "none" ? "none" : `${p.warranty.months} months (${p.warranty.type})`}
          </p>
        </section>
        <section className="rounded-[20px] border border-line bg-surface p-5 text-sm">
          <h2 className="mb-2 font-display text-lg font-bold">Specifications</h2>
          <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1">
            {p.specs.map((sp) => (
              <div key={sp.label} className="contents">
                <dt className="text-text-secondary">{sp.label}</dt>
                <dd>{sp.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="rounded-[20px] border border-line bg-surface p-5 text-sm">
        <h2 className="mb-2 font-display text-lg font-bold">Description</h2>
        {p.shortDescription && <p className="font-semibold">{p.shortDescription}</p>}
        <p className="mt-1 whitespace-pre-line text-text-secondary">{p.description || "—"}</p>
        {p.highlights.length > 0 && (
          <ul className="mt-2 list-inside list-disc text-text-secondary">
            {p.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Always mounted: after the last decision the form shows its result instead of buttons. */}
      <section
        className={allowed.length > 0 ? "rounded-[20px] border border-line bg-surface p-5" : "empty:hidden"}
      >
        {allowed.length > 0 && <h2 className="mb-3 font-display text-lg font-bold">Decision</h2>}
        <DecisionForm kind="product" id={p.id} allowed={allowed} />
      </section>
    </div>
  );
}
