import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, ExternalLink } from "lucide-react";
import { ProductForm } from "@/components/seller/products/ProductForm";
import { ProductImages } from "@/components/seller/products/ProductImages";
import { ProductStatusBar } from "@/components/seller/products/ProductStatusBar";
import { objectId } from "@/lib/validation/common";
import { getMyProduct, getProductFormOptions } from "@/modules/products/seller";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export const metadata: Metadata = { title: "Edit product — Seller", robots: { index: false } };

/** Edit product (P6-T03): status, photos, details, variants. Another shop's product is a 404. */
export default async function EditProductPage({ params, searchParams }: Props) {
  const id = objectId.safeParse((await params).id);
  if (!id.success) notFound();
  const [product, options] = await Promise.all([getMyProduct(id.data), getProductFormOptions()]);
  if (!product) notFound();
  const created = (await searchParams).created === "1";

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] text-text-secondary">
          <Link href="/seller/products" className="hover:text-text">
            Products
          </Link>{" "}
          / {product.shortName}
        </p>
        <h1 className="mt-1 font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          {product.name}
        </h1>
        {product.status === "published" && (
          <Link
            href={`/p/${product.slug}`}
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-light hover:text-text"
          >
            View in the store <ExternalLink aria-hidden className="size-4" />
          </Link>
        )}
      </header>

      {created && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-[20px] border border-success/35 bg-success/10 p-4 text-sm"
        >
          <CircleCheck aria-hidden className="size-5 text-success" /> Draft saved. Add photos below, then send
          it for review.
        </p>
      )}

      <ProductStatusBar id={product.id} status={product.status} hasImages={product.images.length > 0} />
      <ProductImages id={product.id} images={product.images} />
      <ProductForm key={product.variants.map((v) => v.sku).join()} options={options} product={product} />
    </div>
  );
}
