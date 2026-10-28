import type { BadgeTone } from "@/components/ui/Badge";
import type { ProductStatus } from "@/modules/products/types";

/** Seller-facing product status: label, colour, and what it means for buyers. */
export const productStatus: Record<ProductStatus, { label: string; tone: BadgeTone; help: string }> = {
  draft: {
    label: "Draft",
    tone: "neutral",
    help: "Only you can see it. Add photos and send it for review when it's ready.",
  },
  pending_review: {
    label: "In review",
    tone: "accent",
    help: "Teleshop checks new products and big price changes before they go on sale.",
  },
  published: { label: "On sale", tone: "success", help: "Buyers can find and order it." },
  inactive: { label: "Off sale", tone: "neutral", help: "Hidden from buyers. Put it back on sale any time." },
  blocked: {
    label: "Blocked",
    tone: "danger",
    help: "Teleshop removed this product. Contact support if you think that's wrong.",
  },
};
