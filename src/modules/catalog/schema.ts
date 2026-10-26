import { z } from "zod";
import type { ProductQuery, SpecFilterDTO } from "./types";

const csv = z
  .string()
  .max(300)
  .transform((s) =>
    s
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20),
  );

const rupees = z.coerce.number().int().min(0).max(100_000_000);

const slug = z
  .string()
  .max(80)
  .regex(/^[a-z0-9-]+$/);

/** URL search params for /shop and /c/[slug]. Invalid values are dropped, never trusted. */
export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  brand: csv.optional().catch(undefined),
  condition: csv
    .pipe(z.array(z.enum(["new", "used", "refurbished"])))
    .optional()
    .catch(undefined),
  min: rupees.optional().catch(undefined),
  max: rupees.optional().catch(undefined),
  inStock: z
    .enum(["1", "true"])
    .transform(() => true)
    .optional()
    .catch(undefined),
  sort: z
    .enum(["featured", "price_asc", "price_desc", "rating", "newest", "discount"])
    .optional()
    .catch(undefined),
  seller: slug.optional().catch(undefined),
  cursor: z
    .string()
    .regex(/^\d{1,6}$/)
    .optional()
    .catch(undefined),
});

export type RawSearchParams = Record<string, string | string[] | undefined>;

const MULTI_KEYS = new Set(["brand", "condition"]);

/** URL prefix for spec filters: `?spec.storage=256GB,512GB` (repeated checkboxes also work). */
export const SPEC_PARAM_PREFIX = "spec.";

/**
 * Spec filters from the URL, kept only when the key is a filterable spec of this category and every
 * value is one of its listed options — an allow-list, so nothing user-typed reaches the query.
 */
export function parseSpecFilters(
  params: RawSearchParams,
  specFilters: readonly SpecFilterDTO[],
): Record<string, string[]> | undefined {
  const out: Record<string, string[]> = {};
  for (const f of specFilters) {
    const raw = params[`${SPEC_PARAM_PREFIX}${f.key}`];
    const values = (Array.isArray(raw) ? raw : raw ? [raw] : [])
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter((v) => f.options.includes(v));
    if (values.length) out[f.key] = [...new Set(values)].slice(0, 10);
  }
  return Object.keys(out).length ? out : undefined;
}

/** Turns Next.js `searchParams` into a validated `ProductQuery`. */
export function parseProductQuery(
  params: RawSearchParams,
  category?: string,
  specFilters: readonly SpecFilterDTO[] = [],
): ProductQuery {
  const flat: Record<string, string> = {};
  for (const [k, val] of Object.entries(params)) {
    // Filter forms post repeated checkboxes (?brand=a&brand=b); other keys use the first value.
    const value = Array.isArray(val) ? (MULTI_KEYS.has(k) ? val.join(",") : val[0]) : val;
    if (typeof value === "string" && value.trim() !== "") flat[k] = value;
  }
  const p = productQuerySchema.parse(flat);
  return {
    category,
    q: p.q || undefined,
    brand: p.brand?.length ? p.brand : undefined,
    condition: p.condition?.length ? p.condition : undefined,
    minPriceCents: p.min !== undefined ? p.min * 100 : undefined,
    maxPriceCents: p.max !== undefined ? p.max * 100 : undefined,
    inStock: p.inStock,
    sort: p.sort ?? "featured",
    seller: p.seller,
    specs: parseSpecFilters(params, specFilters),
    cursor: p.cursor,
  };
}
