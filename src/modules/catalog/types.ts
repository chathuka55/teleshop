/** Plain DTOs returned to pages — never Mongoose documents (RULES.md). Money is integer cents. */

export type ProductArtKind =
  "phone" | "laptop" | "headphones" | "watch" | "cpu" | "gpu" | "monitor" | "router" | "gamepad";

export type ProductCondition = "new" | "used" | "refurbished";

export type RatingDTO = { average: number; count: number };

export type CategoryDTO = {
  id: string;
  slug: string;
  name: string;
  icon: "phone" | "laptop" | "cpu" | "headphones" | "watch" | "monitor" | "gamepad" | "wifi";
  productCount: number;
  specFilters: SpecFilterDTO[];
};

export type SpecFilterDTO = { key: string; label: string; options: string[] };

export type BrandDTO = { id: string; slug: string; name: string };

export type SellerCardDTO = {
  id: string;
  slug: string;
  shopName: string;
  initials: string;
  shopTypeLabel: string;
  city: string;
  rating: RatingDTO;
  productCount: number;
  since: number;
  tags: string[];
  gradient: [string, string];
};

export type VariantDTO = {
  sku: string;
  label: string;
  attributes: Record<string, string>;
  priceCents: number;
  compareAtCents: number | null;
  inStock: boolean;
  available: number;
};

export type ProductCardDTO = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: { slug: string; name: string };
  brand: { slug: string; name: string };
  seller: { slug: string; shopName: string };
  priceCents: number;
  compareAtCents: number | null;
  rating: RatingDTO;
  condition: ProductCondition;
  isNew: boolean;
  freeDelivery: boolean;
  art: { kind: ProductArtKind; tint: "blue" | "orange" | "silver" | "amber" };
  imageUrl: string | null;
};

export type ProductImageDTO = { url: string; alt: string; width: number | null; height: number | null };

export type ProductDetailDTO = ProductCardDTO & {
  images: ProductImageDTO[];
  shortDescription: string;
  description: string;
  specs: { label: string; value: string }[];
  variants: VariantDTO[];
  warranty: { months: number; type: "manufacturer" | "shop" | "none" };
  highlights: string[];
};

export type ProductSort = "featured" | "price_asc" | "price_desc" | "rating" | "newest" | "discount";

export type ProductQuery = {
  category?: string;
  brand?: string[];
  condition?: ProductCondition[];
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  q?: string;
  sort?: ProductSort;
  seller?: string;
  /** Only products with at least one discounted variant (compare-at > price) — the Deals page. */
  deals?: boolean;
  cursor?: string;
  limit?: number;
};

export type ProductPage = { items: ProductCardDTO[]; nextCursor: string | null; total: number };
