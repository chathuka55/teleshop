import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Package,
  Phone,
  Star,
  Truck,
} from "lucide-react";
import { ProductListing } from "@/components/product/ProductListing";
import { ShopMap } from "@/components/shop/ShopMap";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { directionsUrl, osmUrl } from "@/lib/geo/tiles";
import { formatPhoneLK } from "@/lib/utils/strings";
import { getSellerProfile, listBrands, searchProducts } from "@/modules/catalog/service";
import { parseProductQuery, type RawSearchParams } from "@/modules/catalog/schema";
import type { SellerProfileDTO } from "@/modules/catalog/types";

type Props = { params: Promise<{ shop: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seller = await getSellerProfile((await params).shop);
  if (!seller) return { title: "Shop not found" };
  const description =
    seller.description ||
    `${seller.shopName} — ${seller.shopTypeLabel} in ${seller.address.city}. Verified on Teleshop.`;
  return {
    title: seller.shopName,
    description,
    openGraph: seller.coverUrl ? { images: [{ url: seller.coverUrl }] } : undefined,
  };
}

/** Figma "19 · Seller Shop Page" (22:2060) — immersive shop profile + the shop's products. */
export default async function SellerShopPage({ params, searchParams }: Props) {
  const seller = await getSellerProfile((await params).shop);
  if (!seller) notFound();
  const query = { ...parseProductQuery(await searchParams), seller: seller.slug };
  const [page, brands] = await Promise.all([searchProducts(query), listBrands()]);

  return (
    <>
      <ShopHero seller={seller} />
      <ShopDetails seller={seller} />
      <ProductListing
        title={`Products from ${seller.shopName}`}
        subtitle={`${page.total.toLocaleString("en-LK")} products · prices include VAT · Cash on Delivery`}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Shops", href: "/sellers" },
          { label: seller.shopName },
        ]}
        basePath={`/s/${seller.slug}`}
        query={query}
        page={page}
        brands={brands}
      />
      <ShopJsonLd seller={seller} />
    </>
  );
}

function ShopHero({ seller }: { seller: SellerProfileDTO }) {
  const stats = [
    {
      icon: Star,
      value: seller.rating.average.toFixed(1),
      label: `${seller.rating.count.toLocaleString("en-LK")} ratings`,
    },
    { icon: Package, value: seller.productCount.toLocaleString("en-LK"), label: "products" },
    { icon: CalendarDays, value: String(seller.since), label: "selling since" },
  ];
  return (
    <section aria-labelledby="shop-name" className="relative isolate">
      {/* Cover photo with a dark fade into the page */}
      <div className="relative h-[260px] overflow-hidden sm:h-[340px] lg:h-[440px]">
        {seller.coverUrl ? (
          <Image
            src={seller.coverUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-[1.02] object-cover motion-safe:animate-[cover-in_1.6s_ease-out]"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundImage: `linear-gradient(135deg, ${seller.gradient[0]}, #0b1120 70%)` }}
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-bg via-bg/55 to-bg/10" />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-r from-bg/70 via-transparent to-transparent"
        />
      </div>

      {/* Floating glass identity card (hero card — glass allowed, docs/05 §2) */}
      <div className="container-page relative -mt-32 sm:-mt-36 lg:-mt-44">
        <div className="glass flex flex-col gap-5 rounded-[26px] p-5 md:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <span
              className="grid size-24 shrink-0 place-items-center rounded-[26px] font-display text-[34px] font-bold shadow-[0_18px_40px_rgb(0_0_0/0.45)] ring-4 ring-bg md:size-28"
              style={{
                backgroundImage: `linear-gradient(135deg, ${seller.gradient[0]}, ${seller.gradient[1]})`,
              }}
            >
              {seller.initials}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-wide text-primary-soft uppercase">
                {seller.shopTypeLabel} · {seller.address.city}
              </p>
              <h1
                id="shop-name"
                className="mt-1 flex flex-wrap items-center gap-2 font-display text-[30px] leading-tight font-bold tracking-[-0.02em] md:text-[42px]"
              >
                {seller.shopName}
                <BadgeCheck aria-label="Verified seller" className="size-7 text-primary-light" />
              </h1>
              <ul className="mt-3 flex flex-wrap gap-2">
                {seller.tags.map((t) => (
                  <li key={t}>
                    <Badge>{t}</Badge>
                  </li>
                ))}
                {seller.acceptsCod && (
                  <li>
                    <Badge tone="success" dot>
                      Cash on Delivery
                    </Badge>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <dl className="grid grid-cols-3 gap-2 sm:flex sm:gap-6">
              {stats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col">
                  <dt className="order-2 text-xs text-text-secondary">{label}</dt>
                  <dd className="order-1 flex items-center gap-1.5 font-display text-xl font-bold md:text-2xl">
                    <Icon aria-hidden className="size-4 text-accent" />
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2.5">
              <ButtonLink href={`tel:${seller.phone}`} size="sm">
                <Phone aria-hidden /> Call {formatPhoneLK(seller.phone)}
              </ButtonLink>
              {seller.location && (
                <ButtonLink
                  href={directionsUrl(seller.location.lat, seller.location.lng)}
                  variant="glass"
                  size="sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation aria-hidden /> Get directions
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShopDetails({ seller }: { seller: SellerProfileDTO }) {
  const address = `${seller.address.line1}, ${seller.address.city}`;
  return (
    <section aria-label="About the shop" className="container-page mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-5">
        <div className="rounded-[22px] border border-line bg-surface p-6">
          <h2 className="font-display text-xl font-bold">About {seller.shopName}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            {seller.description ||
              `${seller.shopName} is a verified ${seller.shopTypeLabel.toLowerCase()} in ${seller.address.city}.`}
          </p>
          <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {seller.openingHours && (
              <li className="flex items-start gap-2.5">
                <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-primary-light" />
                <span>
                  <span className="block font-semibold">Opening hours</span>
                  <span className="text-text-secondary">{seller.openingHours}</span>
                </span>
              </li>
            )}
            <li className="flex items-start gap-2.5">
              <Truck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary-light" />
              <span>
                <span className="block font-semibold">Island-wide delivery</span>
                <span className="text-text-secondary">Courier tracking on every package</span>
              </span>
            </li>
          </ul>
        </div>

        {seller.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {seller.photos.slice(0, 4).map((p, i) => (
              <div
                key={p.url}
                className={
                  i === 0 && seller.photos.length % 2 === 1
                    ? "relative col-span-2 aspect-[16/7] overflow-hidden rounded-[18px] border border-line"
                    : "relative aspect-[4/3] overflow-hidden rounded-[18px] border border-line"
                }
              >
                <Image
                  src={p.url}
                  alt={p.alt}
                  fill
                  sizes="(min-width: 1024px) 320px, 50vw"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[22px] border border-line bg-surface">
        {seller.location ? (
          <ShopMap
            lat={seller.location.lat}
            lng={seller.location.lng}
            label={`${seller.shopName}, ${address}`}
            className="h-[280px] md:h-[340px]"
          />
        ) : (
          <div className="grid h-[200px] place-items-center text-sm text-text-muted">Map coming soon</div>
        )}
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start gap-3">
            <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-primary-light" />
            <div>
              <h2 className="font-display text-lg font-bold">Visit the shop</h2>
              <address className="text-sm text-text-secondary not-italic">
                {seller.address.line1}
                <br />
                {seller.address.city}, {seller.address.district} District
              </address>
            </div>
          </div>
          {seller.location && (
            <div className="flex flex-wrap gap-2.5">
              <ButtonLink
                href={directionsUrl(seller.location.lat, seller.location.lng)}
                size="sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation aria-hidden /> Directions
              </ButtonLink>
              <ButtonLink
                href={osmUrl(seller.location.lat, seller.location.lng)}
                variant="glass"
                size="sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink aria-hidden /> Open map
              </ButtonLink>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** schema.org store markup for search engines (name, address, map pin, rating). */
function ShopJsonLd({ seller }: { seller: SellerProfileDTO }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    name: seller.shopName,
    description: seller.description || undefined,
    image: seller.coverUrl ?? undefined,
    telephone: seller.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: seller.address.line1,
      addressLocality: seller.address.city,
      addressRegion: seller.address.district,
      addressCountry: "LK",
    },
    geo: seller.location
      ? { "@type": "GeoCoordinates", latitude: seller.location.lat, longitude: seller.location.lng }
      : undefined,
    aggregateRating:
      seller.rating.count > 0
        ? { "@type": "AggregateRating", ratingValue: seller.rating.average, reviewCount: seller.rating.count }
        : undefined,
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output only; "<" is escaped so the data can't close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
