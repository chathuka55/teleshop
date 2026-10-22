import type { ProductDetailDTO } from "@/modules/catalog/types";
import { seedBrands, seedCategories, seedProducts, seedSellers } from "../../scripts/seed/data/catalog";

/** Pure ProductDetailDTOs built from the seed catalogue — unit-test fixtures (no database). */
export function fixtureProducts(): ProductDetailDTO[] {
  return seedProducts.map((p, i) => {
    const category = seedCategories.find((c) => c.slug === p.category);
    const brand = seedBrands.find((b) => b.toLowerCase().replace(/[^a-z0-9]+/g, "-") === p.brand);
    const seller = seedSellers.find((s) => s.slug === p.seller);
    const variants = p.variants.map((v) => ({
      sku: v.sku,
      label: v.label,
      attributes: v.attributes,
      priceCents: v.price * 100,
      compareAtCents: v.compareAt ? v.compareAt * 100 : null,
      available: v.stock,
      inStock: v.stock > 0,
    }));
    const cheapest = [...variants].sort((a, b) => a.priceCents - b.priceCents)[0];
    return {
      id: `p${i + 1}`,
      slug: p.slug,
      name: p.name,
      shortName: p.shortName,
      category: { slug: p.category, name: category?.name ?? p.category },
      brand: { slug: p.brand, name: brand ?? p.brand },
      seller: { slug: p.seller, shopName: seller?.shopName ?? p.seller },
      priceCents: cheapest?.priceCents ?? 0,
      compareAtCents: cheapest?.compareAtCents ?? null,
      rating: p.rating,
      condition: p.condition ?? "new",
      isNew: !!p.isNew,
      freeDelivery: !!p.freeDelivery,
      art: { kind: "phone", tint: "blue" },
      imageUrl: null,
      shortDescription: p.shortDescription,
      description: p.description ?? "",
      specs: Object.entries(p.specs).map(([label, value]) => ({ label, value })),
      variants,
      warranty: p.warranty,
      highlights: p.highlights,
    };
  });
}
