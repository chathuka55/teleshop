import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, BadgeCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { Stars } from "@/components/product/Rating";
import { WishlistToggle } from "@/components/product/WishlistToggle";
import { ReviewList } from "@/components/reviews/ReviewList";
import { getProductBySlug, getSeller, listRelatedProducts } from "@/modules/catalog/service";
import { listProductReviews } from "@/modules/reviews/service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: { title: product.name, description: product.shortDescription },
  };
}

const conditionLabel = { new: "Brand New", used: "Used", refurbished: "Refurbished" } as const;
const warrantyLabel = {
  manufacturer: "manufacturer warranty",
  shop: "shop warranty",
  none: "no warranty",
} as const;

/** Figma "03 · Product Details" (9:849) / "M3 · Mobile — Product Details" (24:3079). */
export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const [seller, related, reviews] = await Promise.all([
    getSeller(product.seller.slug),
    listRelatedProducts(product),
    listProductReviews(product.id),
  ]);
  const totalStock = product.variants.reduce((n, v) => n + v.available, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    brand: { "@type": "Brand", name: product.brand.name },
    sku: product.variants[0]?.sku,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating.average,
      reviewCount: product.rating.count,
    },
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      priceCurrency: "LKR",
      price: (v.priceCents / 100).toFixed(2),
      availability: v.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteConfig.url}/p/${product.slug}`,
      seller: { "@type": "Organization", name: product.seller.shopName },
    })),
  };

  return (
    <div className="container-page pt-6 pb-16 md:pt-8">
      {/* JSON data block (not executable), safe under the nonce CSP. `<` escaped to avoid </script> breakout. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: product.category.name, href: `/c/${product.category.slug}` },
          { label: product.shortName },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="relative">
          <ProductGallery product={product} />
          <div className="absolute top-4 right-4 flex gap-2">
            <WishlistToggle productId={product.id} productName={product.shortName} />
            <Link
              href={`/compare?add=${product.slug}`}
              aria-label="Add to compare"
              className="grid size-[34px] place-items-center rounded-[10px] border border-white/10 bg-black/35 hover:bg-black/55"
            >
              <ArrowLeftRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.06em] uppercase">
            <Link href={`/shop?brand=${product.brand.slug}`} className="text-primary-light hover:text-text">
              {product.brand.name}
            </Link>
            <span className="text-text-muted">·</span>
            <Link href={`/c/${product.category.slug}`} className="text-primary-light hover:text-text">
              {product.category.name}
            </Link>
            <Badge tone="primary" size="sm" className="normal-case">
              {conditionLabel[product.condition]}
            </Badge>
            {totalStock > 0 ? (
              <Badge tone="success" size="sm" dot className="normal-case">
                In stock · {totalStock} left
              </Badge>
            ) : (
              <Badge tone="danger" size="sm" className="normal-case">
                Out of stock
              </Badge>
            )}
          </div>

          <h1 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em] md:text-[34px]">
            {product.name}
          </h1>

          <div className="flex items-center gap-2 text-[13px] text-text-secondary">
            <Stars value={product.rating.average} />
            <span className="font-semibold text-text">{product.rating.average.toFixed(1)}</span>·
            <a href="#reviews" className="hover:text-text">
              {product.rating.count.toLocaleString("en-LK")} reviews
            </a>
          </div>

          <p className="text-[15px] leading-relaxed text-text-secondary">{product.shortDescription}</p>

          <PurchasePanel product={product} />

          {seller && (
            <div className="flex items-center gap-3.5 rounded-[18px] border border-line bg-surface p-4">
              <span
                className="grid size-12 shrink-0 place-items-center rounded-[14px] font-display font-bold"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${seller.gradient[0]}, ${seller.gradient[1]})`,
                }}
              >
                {seller.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  Sold by {seller.shopName}
                  <BadgeCheck aria-label="Verified seller" className="size-4 text-primary-light" />
                </p>
                <p className="truncate text-xs text-text-secondary">
                  {seller.shopTypeLabel} · {seller.city} · {seller.rating.average.toFixed(1)} ★
                </p>
              </div>
              <ButtonLink href={`/s/${seller.slug}`} variant="glass" size="sm">
                Visit shop
              </ButtonLink>
            </div>
          )}

          <ul className="grid gap-2.5 text-xs sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                text: `${product.warranty.months}-month ${warrantyLabel[product.warranty.type]}`,
              },
              { icon: RefreshCw, text: "7-day replacement" },
              { icon: BadgeCheck, text: "100% genuine" },
            ].map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-3"
              >
                <Icon aria-hidden className="size-4 shrink-0 text-primary-light" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <nav aria-label="Product sections" className="no-scrollbar mt-12 flex gap-1 overflow-x-auto">
        <div className="flex gap-1 rounded-[14px] border border-line bg-surface p-1">
          {[
            ["specs", "Specifications"],
            ["description", "Description"],
            ["reviews", `Reviews (${product.rating.count})`],
            ["warranty", "Warranty & Returns"],
          ].map(([id, label], i) => (
            <a
              key={id}
              href={`#${id}`}
              className={
                i === 0
                  ? "rounded-[10px] bg-primary px-4 py-2 text-[13px] font-semibold whitespace-nowrap"
                  : "rounded-[10px] px-4 py-2 text-[13px] font-medium whitespace-nowrap text-text-secondary hover:text-text"
              }
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <section id="specs" className="scroll-mt-28 rounded-[22px] border border-line bg-surface p-5 md:p-6">
          <h2 className="mb-4 text-lg font-bold">Technical specifications</h2>
          <dl className="overflow-hidden rounded-xl text-sm">
            {product.specs.map((s, i) => (
              <div
                key={s.label}
                className={`grid grid-cols-[140px_1fr] gap-4 px-4 py-3 ${i % 2 === 0 ? "bg-white/4" : ""}`}
              >
                <dt className="text-text-secondary">{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
            <div
              className={`grid grid-cols-[140px_1fr] gap-4 px-4 py-3 ${product.specs.length % 2 === 0 ? "bg-white/4" : ""}`}
            >
              <dt className="text-text-secondary">Warranty</dt>
              <dd>
                {product.warranty.months} months · {warrantyLabel[product.warranty.type]}
              </dd>
            </div>
          </dl>
        </section>

        <section
          id="reviews"
          className="scroll-mt-28 rounded-[22px] border border-line bg-surface p-5 md:p-6"
        >
          <h2 className="mb-4 text-lg font-bold">Customer reviews</h2>
          <div className="flex items-center gap-5">
            <div>
              <p className="font-display text-5xl font-bold">{product.rating.average.toFixed(1)}</p>
              <Stars value={product.rating.average} className="mt-1" />
              <p className="mt-1 text-xs text-text-secondary">
                {product.rating.count.toLocaleString("en-LK")} reviews
              </p>
            </div>
            <p className="text-[13px] leading-relaxed text-text-secondary">
              Only customers who received this item can review it. Every review is a verified purchase.
            </p>
          </div>
          <ReviewList reviews={reviews} />
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section
          id="description"
          className="scroll-mt-28 rounded-[22px] border border-line bg-surface p-5 md:p-6"
        >
          <h2 className="mb-3 text-lg font-bold">Description</h2>
          <p className="text-sm leading-relaxed text-text-secondary">{product.description}</p>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {product.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2">
                <BadgeCheck aria-hidden className="size-4 text-success" />
                {h}
              </li>
            ))}
          </ul>
        </section>
        <section
          id="warranty"
          className="scroll-mt-28 rounded-[22px] border border-line bg-surface p-5 md:p-6"
        >
          <h2 className="mb-3 text-lg font-bold">Warranty &amp; returns</h2>
          <ul className="flex flex-col gap-2.5 text-sm text-text-secondary">
            <li>
              {product.warranty.months}-month {warrantyLabel[product.warranty.type]}, honoured by{" "}
              {product.seller.shopName}.
            </li>
            <li>7-day replacement for manufacturing defects — keep the box and accessories.</li>
            <li>Check your item before paying the courier. Refuse delivery if the seal is broken.</li>
          </ul>
          <Link
            href="/help#returns"
            className="mt-4 inline-block text-sm font-semibold text-primary-light hover:text-text"
          >
            Read the returns policy →
          </Link>
        </section>
      </div>

      {related.length > 0 && (
        <section className="pt-14">
          <SectionHeader
            title="You may also like"
            action={{ label: "View all", href: `/c/${product.category.slug}` }}
          />
          <ul className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id} className="flex [&>article]:flex-1">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
