import { z } from "zod";
import { objectId } from "@/lib/validation/common";
import { stripControlChars } from "@/modules/reviews/schema";

/** Up to 8 digits of rupees and at most 2 of cents ("389900", "389900.5"). */
function isRupees(v: string): boolean {
  const [whole = "", frac, ...rest] = v.split(".");
  return rest.length === 0 && /^\d{1,8}$/.test(whole) && (frac === undefined || /^\d{1,2}$/.test(frac));
}

/** "389,900" / "389900.50" (rupees) → integer cents. Money is never a float after this. */
export const lkrPrice = z
  .string()
  .trim()
  .transform((v) => v.replace(/,/g, ""))
  .pipe(
    z
      .string()
      .refine(isRupees, "Enter a price in rupees, e.g. 389900")
      .transform((v) => {
        const [whole = "0", frac = ""] = v.split(".");
        return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
      })
      .refine((c) => c > 0, "The price must be more than 0"),
  );

const text = (max: number) =>
  z.string().trim().max(max, `Keep it under ${max} characters`).transform(stripControlChars);

export const SKU_PATTERN = /^[A-Z0-9-]{2,64}$/;

export const variantInputSchema = z
  .object({
    /** Existing SKUs can't change (stock and past orders use them); blank = generate one. */
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || SKU_PATTERN.test(v), "Use 2–64 capital letters, digits or dashes"),
    label: text(80),
    attributes: z.record(z.string().regex(/^[a-z][a-zA-Z0-9]{0,30}$/), text(40)).default({}),
    price: lkrPrice,
    compareAt: z.union([z.literal(""), lkrPrice]).default(""),
    stock: z.coerce.number().int("Whole units only").min(0, "Can't be negative").max(100_000).default(0),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.compareAt === "" || v.compareAt > v.price, {
    path: ["compareAt"],
    message: "The “was” price must be higher than the price",
  });
export type VariantInput = z.infer<typeof variantInputSchema>;

export const productInputSchema = z
  .object({
    id: z.union([z.literal(""), objectId]).default(""),
    categoryId: z.string().regex(/^[a-f\d]{24}$/i, "Choose a category"),
    brandId: z.string().regex(/^[a-f\d]{24}$/i, "Choose a brand"),
    name: text(140).refine((v) => v.length >= 3, "Enter the full product name"),
    shortName: text(60).refine((v) => v.length >= 2, "Enter a short name for cards and the cart"),
    condition: z.enum(["new", "used", "refurbished"]),
    shortDescription: text(300),
    description: text(5000),
    highlights: z.array(text(60)).max(6, "Up to 6 highlights").default([]),
    specs: z.record(z.string().regex(/^[a-z][a-zA-Z0-9]{0,30}$/), text(120)).default({}),
    warrantyMonths: z.coerce.number().int().min(0).max(120, "Up to 120 months"),
    warrantyType: z.enum(["manufacturer", "shop", "none"]),
    freeDelivery: z.boolean().default(false),
    variants: z.array(variantInputSchema).min(1, "Add at least one variant").max(50, "Up to 50 variants"),
  })
  .superRefine((p, ctx) => {
    const skus = p.variants.map((v) => v.sku).filter(Boolean);
    if (new Set(skus).size !== skus.length) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Each variant needs its own SKU" });
    }
    const labels = p.variants.map((v) => variantLabel(v).toLowerCase());
    if (labels.some((l) => !l)) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Give every variant a name or an option" });
    } else if (new Set(labels).size !== labels.length) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Two variants have the same name" });
    }
    if (p.warrantyType === "none" && p.warrantyMonths > 0) {
      ctx.addIssue({ code: "custom", path: ["warrantyType"], message: "Choose who gives the warranty" });
    }
  });
export type ProductInput = z.infer<typeof productInputSchema>;

/** Label shown to buyers: what the seller typed, else the option values ("256GB / Silver"). */
export function variantLabel(v: { label: string; attributes: Record<string, string> }): string {
  return v.label || Object.values(v.attributes).filter(Boolean).join(" / ");
}

export const stockChangeSchema = z.object({
  sku: z.string().trim().toUpperCase().regex(SKU_PATTERN),
  mode: z.enum(["add", "remove", "set"]),
  qty: z.coerce.number().int("Whole units only").min(0, "Can't be negative").max(100_000),
});
export type StockChangeInput = z.infer<typeof stockChangeSchema>;

export const productStatusSchema = z.object({
  id: objectId,
  action: z.enum(["submit", "deactivate", "reactivate"]),
});
export type ProductStatusInput = z.infer<typeof productStatusSchema>;
