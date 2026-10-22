"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, Check, Minus, Plus, ShoppingCart, Truck, Zap } from "lucide-react";
import type { ProductDetailDTO, VariantDTO } from "@/modules/catalog/types";
import { useCart } from "@/hooks/use-cart";
import { discountPercent, formatLKR } from "@/lib/utils/money";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { defaultVariant, optionGroups, selectVariant } from "./variant-select";

const SWATCH: Record<string, string> = {
  "cosmic orange": "#f97316",
  "deep blue": "#1e3a8a",
  silver: "#e5e7eb",
  "platinum silver": "#d1d5db",
  black: "#111827",
  midnight: "#1f2937",
  obsidian: "#0f172a",
  "titanium grey": "#6b7280",
  "titan grey": "#6b7280",
  blue: "#2563eb",
};

/** Variant picker + price + qty + Add to cart (Figma 03 right column). Client leaf. */
export function PurchasePanel({ product }: { product: ProductDetailDTO }) {
  const router = useRouter();
  const { add } = useCart();
  const [variant, setVariant] = useState<VariantDTO | undefined>(() => defaultVariant(product.variants));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  if (!variant) return null;

  const groups = optionGroups(product.variants);
  const discount = discountPercent(variant.priceCents, variant.compareAtCents);
  const maxQty = Math.max(1, Math.min(10, variant.available));

  const choose = (key: string, value: string): void => {
    setVariant((cur) => (cur ? selectVariant(product.variants, cur, key, value) : cur));
    setQty(1);
    setAdded(false);
  };

  const addToCart = (): boolean => {
    if (!variant.inStock) return false;
    add(variant.sku, qty);
    setAdded(true);
    return true;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[20px] border border-primary/30 bg-linear-to-r from-[#13203f] to-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-[32px] leading-none font-bold">
            {formatLKR(variant.priceCents)}
          </span>
          {discount > 0 && variant.compareAtCents && (
            <>
              <span className="text-sm text-text-muted line-through">
                {formatLKR(variant.compareAtCents)}
              </span>
              <Badge tone="accent" size="sm">
                Save {discount}%
              </Badge>
            </>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <Banknote aria-hidden className="size-3.5 text-success" /> Cash on Delivery available
          </span>
          <span className="flex items-center gap-1.5">
            <Truck aria-hidden className="size-3.5 text-primary-light" />
            {product.freeDelivery ? "Free delivery · 2–4 days" : "Delivery in 2–4 days island-wide"}
          </span>
        </div>
      </div>

      {groups.map((g) => (
        <fieldset key={g.key}>
          <legend className="mb-2.5 text-[13px] font-semibold">
            {g.label}
            {g.key === "colour" && (
              <span className="ml-1.5 font-normal text-text-secondary">{variant.attributes.colour}</span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {g.values.map((value) => {
              const selected = variant.attributes[g.key] === value;
              const sample = product.variants.find((v) => v.attributes[g.key] === value);
              const outOfStock = !product.variants.some((v) => v.attributes[g.key] === value && v.inStock);
              if (g.key === "colour") {
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => choose(g.key, value)}
                    aria-pressed={selected}
                    aria-label={`${value}${outOfStock ? " (out of stock)" : ""}`}
                    title={value}
                    className={cn(
                      "grid size-11 place-items-center rounded-full border-2 transition-colors",
                      selected ? "border-primary-light" : "border-transparent hover:border-white/20",
                      outOfStock && "opacity-40",
                    )}
                  >
                    <span
                      className="size-8 rounded-full border border-white/15"
                      style={{ background: SWATCH[value.toLowerCase()] ?? "#9ca3af" }}
                    />
                  </button>
                );
              }
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose(g.key, value)}
                  aria-pressed={selected}
                  className={cn(
                    "min-h-11 rounded-xl border px-4 py-2 text-left transition-colors",
                    selected
                      ? "border-primary-light bg-primary/12"
                      : "border-line bg-surface hover:border-line-strong",
                    outOfStock && "opacity-50",
                  )}
                >
                  <span className={cn("block text-sm font-semibold", selected && "text-primary-light")}>
                    {value}
                  </span>
                  {sample && (
                    <span className="text-[11px] text-text-secondary">{formatLKR(sample.priceCents)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <p className="text-[13px]" aria-live="polite">
        {variant.inStock ? (
          <span className="text-success">
            In stock{variant.available <= 5 ? ` · only ${variant.available} left` : ""}
          </span>
        ) : (
          <span className="text-danger">Out of stock for {variant.label}</span>
        )}
      </p>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-2.5">
        <div className="flex h-12 items-center rounded-xl border border-line bg-surface">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-full w-10 place-items-center disabled:opacity-40"
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <output aria-label="Quantity" className="w-8 text-center font-semibold">
            {qty}
          </output>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={qty >= maxQty}
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="grid h-full w-10 place-items-center disabled:opacity-40"
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
        <Button size="lg" disabled={!variant.inStock} onClick={addToCart}>
          {added ? <Check aria-hidden /> : <ShoppingCart aria-hidden />}
          {added ? "Added" : "Add to cart"}
        </Button>
        <Button
          size="lg"
          variant="glass"
          disabled={!variant.inStock}
          onClick={() => {
            if (addToCart()) router.push("/cart");
          }}
        >
          <Zap aria-hidden />
          Buy now
        </Button>
      </div>
    </div>
  );
}
