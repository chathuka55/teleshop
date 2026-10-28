import type { ProductStatus, SpecFieldDTO } from "./types";

/** Phase-6 notes: a price change above 20 % goes back to admin review. */
export const REVIEW_PRICE_CHANGE = 0.2;
export const MAX_PRODUCT_IMAGES = 8;

/**
 * True when an edit must be re-approved: an existing variant's price moved more than 20 %, or a
 * new variant is priced outside 20 % of the product's previous price range.
 */
export function priceChangeNeedsReview(
  before: readonly { sku: string; priceCents: number }[],
  after: readonly { sku: string; priceCents: number }[],
): boolean {
  const old = new Map(before.map((v) => [v.sku, v.priceCents]));
  const prices = before.map((v) => v.priceCents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return after.some((v) => {
    const was = old.get(v.sku);
    if (was !== undefined) return Math.abs(v.priceCents - was) / was > REVIEW_PRICE_CHANGE;
    if (!prices.length) return false;
    return v.priceCents < min * (1 - REVIEW_PRICE_CHANGE) || v.priceCents > max * (1 + REVIEW_PRICE_CHANGE);
  });
}

/** Status after the seller saves an edit. Blocked products can't be edited at all. */
export function statusAfterEdit(current: ProductStatus, needsReview: boolean): ProductStatus {
  if (current === "published" || current === "inactive") return needsReview ? "pending_review" : current;
  return current;
}

export function canEditProduct(status: ProductStatus): boolean {
  return status !== "blocked";
}

/** Seller status buttons. Reactivating skips review only for products an admin approved before. */
export const sellerProductActions = {
  submit: { from: ["draft"] },
  deactivate: { from: ["published", "pending_review"] },
  reactivate: { from: ["inactive"] },
} as const satisfies Record<string, { from: readonly ProductStatus[] }>;
export type SellerProductAction = keyof typeof sellerProductActions;

export function canProductAction(action: SellerProductAction, status: ProductStatus): boolean {
  return (sellerProductActions[action].from as readonly ProductStatus[]).includes(status);
}

const isDecimal = (v: string): boolean => {
  const [whole = "", frac, ...rest] = v.split(".");
  return rest.length === 0 && /^\d+$/.test(whole) && (frac === undefined || /^\d+$/.test(frac));
};

/** Specs must follow the category template: known keys only, select values from the options. */
export function cleanSpecs(
  template: readonly SpecFieldDTO[],
  raw: Readonly<Record<string, string>>,
): { specs: Record<string, string>; errors: Record<string, string> } {
  const specs: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const field of template) {
    const value = (raw[field.key] ?? "").trim();
    if (!value) continue;
    if (field.type === "select" && !field.options.includes(value)) {
      errors[field.key] = `Choose one of: ${field.options.join(", ")}`;
    } else if (field.type === "number" && !isDecimal(value)) {
      errors[field.key] = "Enter a number";
    } else {
      specs[field.key] = value;
    }
  }
  return { specs, errors };
}

/** Option keys a variant can carry: the template's select fields (storage, RAM…) + colour. */
export function variantAttributeKeys(template: readonly SpecFieldDTO[]): string[] {
  return [...template.filter((f) => f.type === "select").map((f) => f.key), "colour"];
}

/** "Apple iPhone 17 Pro" → "apple-iphone-17-pro". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** "iPhone 17 Pro" + "256GB / Silver" + "a1b2" → "IPHONE-17-PRO-256GB-SILVER-A1B2". */
export function makeSku(shortName: string, label: string, suffix: string): string {
  const base = slugify(`${shortName} ${label}`)
    .toUpperCase()
    .slice(0, 64 - suffix.length - 1);
  return `${base || "SKU"}-${suffix.toUpperCase()}`;
}
