import type { VariantDTO } from "@/modules/catalog/types";

export type OptionGroup = { key: string; label: string; values: string[] };

const LABELS: Record<string, string> = {
  storage: "Storage",
  colour: "Colour",
  ram: "RAM",
  size: "Size",
  type: "Type",
};

/** Attribute groups that actually vary across variants (single-value attributes are hidden). */
export function optionGroups(variants: readonly VariantDTO[]): OptionGroup[] {
  const keys = [...new Set(variants.flatMap((v) => Object.keys(v.attributes)))];
  return keys
    .map((key) => ({
      key,
      label: LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      values: [...new Set(variants.map((v) => v.attributes[key]).filter((x): x is string => !!x))],
    }))
    .filter((g) => g.values.length > 1);
}

/**
 * Picks the variant after the user chooses `key = value`: keep the other current choices when
 * such a variant exists, otherwise take the first variant with that value (preferring in-stock).
 */
export function selectVariant(
  variants: readonly VariantDTO[],
  current: VariantDTO,
  key: string,
  value: string,
): VariantDTO {
  const wanted = { ...current.attributes, [key]: value };
  const exact = variants.find((v) => Object.entries(wanted).every(([k, val]) => v.attributes[k] === val));
  if (exact) return exact;
  const withValue = variants.filter((v) => v.attributes[key] === value);
  return withValue.find((v) => v.inStock) ?? withValue[0] ?? current;
}

/** Default selection: cheapest in-stock variant, else the first one. */
export function defaultVariant(variants: readonly VariantDTO[]): VariantDTO | undefined {
  const inStock = variants.filter((v) => v.inStock);
  return [...(inStock.length ? inStock : variants)].sort((a, b) => a.priceCents - b.priceCents)[0];
}
