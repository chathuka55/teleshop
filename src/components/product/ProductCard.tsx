import Link from "next/link";
import { ShieldCheck, ShoppingCart } from "lucide-react";
import type { ProductCardDTO } from "@/modules/catalog/types";
import { discountPercent } from "@/lib/utils/money";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { PriceTag } from "./PriceTag";
import { ProductArt } from "./ProductArt";
import { Rating } from "./Rating";
import { WishlistToggle } from "./WishlistToggle";

/**
 * Figma "ProductCard" (7:632). The whole card is a link (stretched ::after),
 * the heart and cart buttons sit above it so we never nest interactive elements.
 */
export function ProductCard({
  product,
  compact = false,
  priority = false,
}: {
  product: ProductCardDTO;
  compact?: boolean;
  priority?: boolean;
}) {
  const discount = discountPercent(product.priceCents, product.compareAtCents);
  const href = `/p/${product.slug}`;

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-3.5 rounded-[20px] border border-white/7 bg-surface p-2.5 transition-[border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-white/15 md:p-3",
      )}
    >
      <div className="relative">
        <ProductArt
          product={product}
          priority={priority}
          className={compact ? "h-[150px]" : "h-[150px] md:h-[210px]"}
        />
        {discount > 0 ? (
          <Badge tone="accent" className="absolute top-3 left-3 bg-accent/22">
            -{discount}%
          </Badge>
        ) : product.isNew ? (
          <Badge tone="primary" className="absolute top-3 left-3">
            NEW
          </Badge>
        ) : null}
        <WishlistToggle
          productId={product.id}
          productName={product.shortName}
          className="absolute top-3 right-3 z-10"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 px-1 pb-1 md:px-1.5 md:pb-1.5">
        {!compact && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">{product.category.name}</span>
            {product.condition === "refurbished" && (
              <Badge tone="accent" size="xs" className="rounded-md px-1.5 text-[10px]">
                Refurbished
              </Badge>
            )}
          </div>
        )}
        <h3 className="text-sm leading-snug font-semibold md:text-[15px]">
          <Link
            href={href}
            className="line-clamp-2 after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none"
          >
            <span className="md:hidden">{product.shortName}</span>
            <span className="hidden md:inline">{product.name}</span>
          </Link>
        </h3>
        <Rating rating={product.rating} compact={compact} className="max-md:[&>span:nth-child(3)]:hidden" />
        {!compact && (
          <span className="hidden items-center gap-1.5 text-xs text-text-secondary md:inline-flex">
            <ShieldCheck aria-hidden className="size-3.5 text-success" />
            {product.seller.shopName}
          </span>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <PriceTag
            priceCents={product.priceCents}
            compareAtCents={product.compareAtCents}
            freeDelivery={product.freeDelivery}
            size="md"
            className="max-md:[&>span:first-child]:text-base"
          />
          <Link
            href={href}
            aria-label={`Choose options for ${product.shortName}`}
            className="bg-gradient-primary relative z-10 grid size-10 shrink-0 place-items-center rounded-[14px] text-on-primary transition-[filter] hover:brightness-110 md:size-11"
          >
            <ShoppingCart aria-hidden className="size-[18px]" />
          </Link>
        </div>
      </div>
    </article>
  );
}
