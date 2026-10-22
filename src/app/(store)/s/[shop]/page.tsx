import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, MapPin, Package, Star } from "lucide-react";
import { ProductListing } from "@/components/product/ProductListing";
import { Badge } from "@/components/ui/Badge";
import { getSeller, listBrands, searchProducts } from "@/modules/catalog/service";
import { parseProductQuery, type RawSearchParams } from "@/modules/catalog/schema";

type Props = { params: Promise<{ shop: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seller = await getSeller((await params).shop);
  return seller
    ? {
        title: seller.shopName,
        description: `${seller.shopName} — ${seller.shopTypeLabel} in ${seller.city}. Verified on Teleshop.`,
      }
    : { title: "Shop not found" };
}

/** Figma "19 · Seller Shop Page" (22:2060). */
export default async function SellerShopPage({ params, searchParams }: Props) {
  const seller = await getSeller((await params).shop);
  if (!seller) notFound();
  const query = { ...parseProductQuery(await searchParams), seller: seller.slug };
  const [page, brands] = await Promise.all([searchProducts(query), listBrands()]);

  return (
    <>
      <section className="container-page pt-6 md:pt-8">
        <div
          className="relative overflow-hidden rounded-[26px] border border-white/10 p-6 md:p-10"
          style={{ backgroundImage: `linear-gradient(135deg, #13203f 0%, #141922 60%)` }}
        >
          <span
            aria-hidden
            className="absolute -top-20 -right-10 size-72 rounded-full bg-primary/25 blur-[90px]"
          />
          <div className="relative flex flex-wrap items-center gap-5">
            <span
              className="grid size-20 shrink-0 place-items-center rounded-[22px] font-display text-3xl font-bold"
              style={{
                backgroundImage: `linear-gradient(135deg, ${seller.gradient[0]}, ${seller.gradient[1]})`,
              }}
            >
              {seller.initials}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 font-display text-[28px] font-bold md:text-[36px]">
                {seller.shopName}
                <BadgeCheck aria-label="Verified seller" className="size-6 text-primary-light" />
              </h1>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-4" /> {seller.shopTypeLabel} · {seller.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <Star aria-hidden className="size-4 fill-accent text-accent" />{" "}
                  {seller.rating.average.toFixed(1)} ({seller.rating.count.toLocaleString("en-LK")} ratings)
                </span>
                <span className="flex items-center gap-1.5">
                  <Package aria-hidden className="size-4" /> {seller.productCount.toLocaleString("en-LK")}{" "}
                  products
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays aria-hidden className="size-4" /> Selling since {seller.since}
                </span>
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {seller.tags.map((t) => (
                  <li key={t}>
                    <Badge>{t}</Badge>
                  </li>
                ))}
                <li>
                  <Badge tone="success" dot>
                    Accepts Cash on Delivery
                  </Badge>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <ProductListing
        title={`Products from ${seller.shopName}`}
        subtitle={`${page.total} listed on Teleshop`}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Sellers", href: "/sellers" },
          { label: seller.shopName },
        ]}
        basePath={`/s/${seller.slug}`}
        query={query}
        page={page}
        brands={brands}
      />
    </>
  );
}
