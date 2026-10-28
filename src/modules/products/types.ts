export type ProductStatus = "draft" | "pending_review" | "published" | "inactive" | "blocked";
export type ProductCondition = "new" | "used" | "refurbished";
export type WarrantyType = "manufacturer" | "shop" | "none";

export type SpecFieldDTO = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  unit: string | null;
  options: string[];
};

/** Choices for the product form: categories with their spec templates, brands. */
export type ProductFormOptionsDTO = {
  categories: { id: string; name: string; specTemplate: SpecFieldDTO[] }[];
  brands: { id: string; name: string }[];
};

export type StockDTO = { onHand: number; reserved: number; available: number; lowStockAt: number };

/** One row of /seller/products. */
export type SellerProductSummaryDTO = {
  id: string;
  slug: string;
  name: string;
  status: ProductStatus;
  imageUrl: string | null;
  minPriceCents: number;
  maxPriceCents: number;
  variantCount: number;
  available: number;
  lowStock: boolean;
  updatedAt: string;
};

/** The shop's own product, for the edit form. */
export type SellerProductDTO = {
  id: string;
  slug: string;
  status: ProductStatus;
  publishedAt: string | null;
  /** Admin's note when the product was sent back or blocked. */
  moderationNote: string | null;
  categoryId: string;
  brandId: string;
  name: string;
  shortName: string;
  condition: ProductCondition;
  shortDescription: string;
  description: string;
  highlights: string[];
  specs: Record<string, string>;
  warranty: { months: number; type: WarrantyType };
  freeDelivery: boolean;
  images: { url: string; width: number | null; height: number | null }[];
  variants: {
    sku: string;
    label: string;
    attributes: Record<string, string>;
    priceCents: number;
    compareAtCents: number | null;
    isActive: boolean;
    stock: StockDTO;
  }[];
};

/** One row of /seller/inventory. */
export type StockRowDTO = StockDTO & {
  productId: string;
  productName: string;
  sku: string;
  label: string;
  imageUrl: string | null;
  isActive: boolean;
};

export type SaveProductResult =
  | { ok: true; id: string; status: ProductStatus; message: string }
  | { ok: false; message: string; fields?: Record<string, string> };

export type ProductActionResult = { ok: true; message: string } | { ok: false; message: string };
