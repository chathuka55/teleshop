import { SPEC_PARAM_PREFIX } from "@/modules/catalog/schema";
import type { ProductQuery } from "@/modules/catalog/types";

/** Builds a listing URL from the current query plus overrides; `undefined` removes a key. */
export function listingHref(
  basePath: string,
  query: ProductQuery,
  patch: Record<string, string | undefined> = {},
): string {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  if (query.brand?.length) p.set("brand", query.brand.join(","));
  if (query.condition?.length) p.set("condition", query.condition.join(","));
  if (query.minPriceCents !== undefined) p.set("min", String(query.minPriceCents / 100));
  if (query.maxPriceCents !== undefined) p.set("max", String(query.maxPriceCents / 100));
  if (query.inStock) p.set("inStock", "1");
  if (query.sort && query.sort !== "featured") p.set("sort", query.sort);
  for (const [key, values] of Object.entries(query.specs ?? {})) {
    if (values.length) p.set(`${SPEC_PARAM_PREFIX}${key}`, values.join(","));
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) p.delete(k);
    else p.set(k, v);
  }
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}
