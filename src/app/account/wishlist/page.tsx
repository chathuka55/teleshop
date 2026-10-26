import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { WishlistSync } from "@/components/product/WishlistSync";
import { ButtonLink } from "@/components/ui/Button";
import { getMyWishlist } from "@/modules/wishlist/service";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

/** Figma "21 · Wishlist". Hearts saved as a guest are merged in by <WishlistSync />. */
export default async function WishlistPage() {
  const products = await getMyWishlist();
  const count = products.length;
  return (
    <div>
      <WishlistSync serverIds={products.map((p) => p.id)} />
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Wishlist</h1>
      <p className="mt-1 mb-6 text-sm text-text-secondary">
        {count ? `${count} saved product${count === 1 ? "" : "s"}` : "Nothing saved yet"}
      </p>
      {count ? (
        <div className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="grid place-items-center rounded-[20px] border border-line bg-surface px-6 py-14 text-center">
          <Heart aria-hidden className="size-8 text-primary-light" />
          <p className="mt-3 max-w-sm text-sm text-text-secondary">
            Tap the heart on any product to save it here — your list follows you to every device.
          </p>
          <ButtonLink href="/shop" className="mt-5">
            Browse products
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
