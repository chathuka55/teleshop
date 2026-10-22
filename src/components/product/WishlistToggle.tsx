"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils/cn";

/**
 * Heart button. Until `toggleWishlistAction` exists (P4-T02) the list is kept in localStorage;
 * after sign-in it will be merged into the user's server-side wishlist.
 */
export function WishlistToggle({
  productId,
  productName,
  className,
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  const saved = has(productId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      onClick={() => toggle(productId)}
      className={cn(
        "grid size-[34px] place-items-center rounded-[10px] border border-white/10 bg-black/35 transition-colors hover:bg-black/55",
        className,
      )}
    >
      <Heart aria-hidden className={cn("size-4", saved ? "fill-danger text-danger" : "text-text")} />
    </button>
  );
}
