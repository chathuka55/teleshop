import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/seller/products/ProductForm";
import { getProductFormOptions } from "@/modules/products/seller";

export const metadata: Metadata = { title: "Add product — Seller", robots: { index: false } };

/** New product (P6-T03). Saved as a draft; photos are added on the next page. */
export default async function NewProductPage() {
  const options = await getProductFormOptions();
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] text-text-secondary">
          <Link href="/seller/products" className="hover:text-text">
            Products
          </Link>{" "}
          / New
        </p>
        <h1 className="mt-1 font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          Add a product
        </h1>
        <p className="text-sm text-text-secondary">
          Save it as a draft, add photos, then send it for review. Teleshop checks every new listing before it
          goes on sale.
        </p>
      </header>
      <ProductForm options={options} />
    </div>
  );
}
