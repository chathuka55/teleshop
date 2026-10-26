import { productImageCredits } from "./product-image-credits";

export type DemoProductImage = { url: string; alt: string; width: number; height: number };

/** Demo photos grouped per product slug, main photo first (migration 0004 + seed). */
export function productImagesBySlug(): Map<string, DemoProductImage[]> {
  const bySlug = new Map<string, DemoProductImage[]>();
  const sorted = [...productImageCredits].sort((a, b) => a.position - b.position);
  for (const c of sorted) {
    const list = bySlug.get(c.slug) ?? [];
    list.push({ url: c.file, alt: "", width: c.width, height: c.height });
    bySlug.set(c.slug, list);
  }
  return bySlug;
}
