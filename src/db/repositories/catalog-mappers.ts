import type { Types } from "mongoose";
import type {
  CategoryDTO,
  ProductArtKind,
  ProductCardDTO,
  ProductDetailDTO,
  SellerCardDTO,
  VariantDTO,
} from "@/modules/catalog/types";
import { initials } from "@/lib/utils/strings";

/** Lean shapes (what `.lean()` / aggregation returns). Maps come back as plain objects. */
export type LeanCategory = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  icon: CategoryDTO["icon"];
  specTemplate: { key: string; label: string; type: string; options: string[]; filterable: boolean }[];
  requiresSerial: boolean;
  sortOrder: number;
};

export type LeanBrand = { _id: Types.ObjectId; name: string; slug: string };

export type LeanSeller = {
  _id: Types.ObjectId;
  shopName: string;
  slug: string;
  shopType: "mobile_shop" | "computer_shop" | "accessories_shop" | "general_tech";
  address: { city: string; district: string };
  establishedYear?: number | null;
  tags?: string[];
  rating?: { average: number; count: number };
  createdAt: Date;
};

export type LeanVariant = {
  _id: Types.ObjectId;
  sku: string;
  label: string;
  attributes?: Record<string, string>;
  priceCents: number;
  compareAtCents?: number | null;
  imageUrl?: string | null;
  isActive: boolean;
};

export type LeanProduct = {
  _id: Types.ObjectId;
  sellerId: Types.ObjectId;
  categoryId: Types.ObjectId;
  brandId: Types.ObjectId;
  name: string;
  shortName: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  highlights?: string[];
  condition: "new" | "used" | "refurbished";
  specs?: Record<string, string>;
  images?: { url: string; alt?: string; width?: number | null; height?: number | null }[];
  variants: LeanVariant[];
  basePriceCents: number;
  freeDelivery?: boolean;
  warranty?: { months: number; type: "manufacturer" | "shop" | "none" };
  rating?: { average: number; count: number };
  publishedAt?: Date | null;
};

const SHOP_TYPE_LABEL: Record<LeanSeller["shopType"], string> = {
  mobile_shop: "Mobile Shop",
  computer_shop: "Computer Shop",
  accessories_shop: "Accessories",
  general_tech: "Tech Shop",
};

const GRADIENTS: [string, string][] = [
  ["#3b82f6", "#1e40af"],
  ["#f59e0b", "#b45309"],
  ["#22c55e", "#15803d"],
  ["#3b82f6", "#1d4ed8"],
  ["#f59e0b", "#d97706"],
];

const ART_BY_ICON: Record<CategoryDTO["icon"], ProductArtKind> = {
  phone: "phone",
  laptop: "laptop",
  cpu: "cpu",
  headphones: "headphones",
  watch: "watch",
  monitor: "monitor",
  gamepad: "gamepad",
  wifi: "router",
};

const NEW_FOR_MS = 45 * 24 * 60 * 60 * 1000;

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function toCategoryDTO(c: LeanCategory, productCount: number): CategoryDTO {
  return {
    id: c._id.toString(),
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    productCount,
    specFilters: c.specTemplate
      .filter((f) => f.filterable && f.options.length > 0)
      .map((f) => ({ key: f.key, label: f.label, options: f.options })),
  };
}

export function toSellerCardDTO(s: LeanSeller, productCount: number): SellerCardDTO {
  const gradient = GRADIENTS[hash(s.slug) % GRADIENTS.length] ?? GRADIENTS[0] ?? ["#3b82f6", "#1e40af"];
  return {
    id: s._id.toString(),
    slug: s.slug,
    shopName: s.shopName,
    initials: initials(s.shopName),
    shopTypeLabel: SHOP_TYPE_LABEL[s.shopType],
    city: s.address.city,
    rating: s.rating ?? { average: 0, count: 0 },
    productCount,
    since: s.establishedYear ?? s.createdAt.getFullYear(),
    tags: s.tags ?? [],
    gradient,
  };
}

/** Device-art tint for products without photos (Figma placeholders). */
function artTint(p: LeanProduct, icon: CategoryDTO["icon"]): ProductCardDTO["art"]["tint"] {
  if (icon === "headphones") return "amber";
  const colour = (p.variants[0]?.attributes?.colour ?? "").toLowerCase();
  if (colour.includes("orange")) return "orange";
  if (/silver|grey|gray|titan|natural|white|platinum/.test(colour)) return "silver";
  return "blue";
}

type Lookups = {
  categories: Map<string, LeanCategory>;
  brands: Map<string, LeanBrand>;
  sellers: Map<string, LeanSeller>;
  /** sku → available */
  stock: Map<string, number>;
};

function cheapestVariant(p: LeanProduct): LeanVariant | undefined {
  const active = p.variants.filter((v) => v.isActive);
  return [...(active.length ? active : p.variants)].sort((a, b) => a.priceCents - b.priceCents)[0];
}

export function toProductCardDTO(p: LeanProduct, l: Lookups, now = Date.now()): ProductCardDTO {
  const category = l.categories.get(p.categoryId.toString());
  const brand = l.brands.get(p.brandId.toString());
  const seller = l.sellers.get(p.sellerId.toString());
  const cheapest = cheapestVariant(p);
  const icon = category?.icon ?? "phone";
  return {
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    shortName: p.shortName,
    category: { slug: category?.slug ?? "", name: category?.name ?? "" },
    brand: { slug: brand?.slug ?? "", name: brand?.name ?? "" },
    seller: { slug: seller?.slug ?? "", shopName: seller?.shopName ?? "" },
    priceCents: cheapest?.priceCents ?? p.basePriceCents,
    compareAtCents: cheapest?.compareAtCents ?? null,
    rating: p.rating ?? { average: 0, count: 0 },
    condition: p.condition,
    isNew: !!p.publishedAt && now - p.publishedAt.getTime() < NEW_FOR_MS,
    freeDelivery: !!p.freeDelivery,
    art: { kind: ART_BY_ICON[icon], tint: artTint(p, icon) },
    imageUrl: p.images?.[0]?.url ?? null,
  };
}

function titleCase(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function toProductDetailDTO(p: LeanProduct, l: Lookups): ProductDetailDTO {
  const card = toProductCardDTO(p, l);
  const template = l.categories.get(p.categoryId.toString())?.specTemplate ?? [];
  const specs = p.specs ?? {};
  const ordered = [
    ...template.filter((t) => specs[t.key]).map((t) => ({ label: t.label, value: specs[t.key] ?? "" })),
    ...Object.entries(specs)
      .filter(([k]) => !template.some((t) => t.key === k))
      .map(([k, value]) => ({ label: titleCase(k), value })),
  ];
  const variants: VariantDTO[] = p.variants
    .filter((v) => v.isActive)
    .map((v) => {
      const available = l.stock.get(v.sku) ?? 0;
      return {
        sku: v.sku,
        label: v.label,
        attributes: v.attributes ?? {},
        priceCents: v.priceCents,
        compareAtCents: v.compareAtCents ?? null,
        available,
        inStock: available > 0,
      };
    });
  return {
    ...card,
    images: (p.images ?? []).map((img) => ({
      url: img.url,
      alt: img.alt || p.name,
      width: img.width ?? null,
      height: img.height ?? null,
    })),
    shortDescription: p.shortDescription ?? "",
    description: p.description ?? "",
    specs: ordered,
    variants,
    warranty: p.warranty ?? { months: 0, type: "none" },
    highlights: p.highlights ?? [],
  };
}
