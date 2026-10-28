"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveProductAction } from "@/modules/products/actions";
import { variantAttributeKeys } from "@/modules/products/access";
import type { ProductFormOptionsDTO, SellerProductDTO } from "@/modules/products/types";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";

type VariantRow = {
  key: string;
  sku: string;
  saved: boolean;
  label: string;
  attributes: Record<string, string>;
  price: string;
  compareAt: string;
  stock: string;
  isActive: boolean;
  reserved: number;
};

const rupees = (cents: number | null): string =>
  cents === null ? "" : cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100);

let rowSeq = 0;
const newRow = (): VariantRow => ({
  key: `new-${++rowSeq}`,
  sku: "",
  saved: false,
  label: "",
  attributes: {},
  price: "",
  compareAt: "",
  stock: "0",
  isActive: true,
  reserved: 0,
});

const input =
  "h-11 w-full rounded-[14px] border bg-white/4 px-3.5 text-sm outline-none placeholder:text-text-muted focus:border-primary-light/60";
const border = (err?: string) => (err ? "border-danger/60" : "border-line");

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-text-secondary">
      {children}
    </label>
  );
}

/** Create / edit a product (Figma S3): details, category specs, variants with price and stock. */
export function ProductForm({
  options,
  product,
}: {
  options: ProductFormOptionsDTO;
  product?: SellerProductDTO;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [brandId, setBrandId] = useState(product?.brandId ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [shortName, setShortName] = useState(product?.shortName ?? "");
  const [condition, setCondition] = useState(product?.condition ?? "new");
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [highlights, setHighlights] = useState((product?.highlights ?? []).join("\n"));
  const [specs, setSpecs] = useState<Record<string, string>>(product?.specs ?? {});
  const [warrantyMonths, setWarrantyMonths] = useState(String(product?.warranty.months ?? 12));
  const [warrantyType, setWarrantyType] = useState(product?.warranty.type ?? "manufacturer");
  const [freeDelivery, setFreeDelivery] = useState(product?.freeDelivery ?? false);
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((v) => ({
      key: v.sku,
      sku: v.sku,
      saved: true,
      label: v.label,
      attributes: v.attributes,
      price: rupees(v.priceCents),
      compareAt: rupees(v.compareAtCents),
      stock: String(v.stock.onHand),
      isActive: v.isActive,
      reserved: v.stock.reserved,
    })) ?? [newRow()],
  );

  const template = useMemo(
    () => options.categories.find((c) => c.id === categoryId)?.specTemplate ?? [],
    [options.categories, categoryId],
  );
  const attrKeys = useMemo(() => variantAttributeKeys(template), [template]);
  const err = (path: string) => errors[path];

  const setVariant = (i: number, patch: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const r = await saveProductAction({
        id: product?.id ?? "",
        categoryId,
        brandId,
        name,
        shortName,
        condition,
        shortDescription,
        description,
        highlights: highlights
          .split("\n")
          .map((h) => h.trim())
          .filter(Boolean),
        specs,
        warrantyMonths: warrantyType === "none" ? "0" : warrantyMonths,
        warrantyType,
        freeDelivery,
        variants: variants.map((v) => ({
          sku: v.sku,
          label: v.label,
          attributes: Object.fromEntries(attrKeys.map((k) => [k, v.attributes[k] ?? ""])),
          price: v.price,
          compareAt: v.compareAt,
          stock: v.saved ? "0" : v.stock,
          isActive: v.isActive,
        })),
      });
      if (!r.ok) {
        setErrors(r.fields ?? {});
        setMessage({ ok: false, text: r.message });
        return;
      }
      setErrors({});
      if (!product) {
        router.push(`/seller/products/${r.id}?created=1`);
        return;
      }
      setMessage({ ok: true, text: r.message });
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <section className="grid gap-4 rounded-[20px] border border-line bg-surface p-5 md:grid-cols-2">
        <h2 className="font-display text-lg font-bold md:col-span-2">Details</h2>
        <div>
          <Label htmlFor="p-category">Category</Label>
          <select
            id="p-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={cn(input, border(err("categoryId")))}
          >
            <option value="">Choose…</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError>{err("categoryId")}</FieldError>
        </div>
        <div>
          <Label htmlFor="p-brand">Brand</Label>
          <select
            id="p-brand"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className={cn(input, border(err("brandId")))}
          >
            <option value="">Choose…</option>
            {options.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <FieldError>{err("brandId")}</FieldError>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="p-name">Product name</Label>
          <input
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={140}
            placeholder="Apple iPhone 17 Pro"
            className={cn(input, border(err("name")))}
          />
          <FieldError>{err("name")}</FieldError>
        </div>
        <div>
          <Label htmlFor="p-short">Short name (cards and cart)</Label>
          <input
            id="p-short"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            maxLength={60}
            placeholder="iPhone 17 Pro"
            className={cn(input, border(err("shortName")))}
          />
          <FieldError>{err("shortName")}</FieldError>
        </div>
        <div>
          <Label htmlFor="p-condition">Condition</Label>
          <select
            id="p-condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value as typeof condition)}
            className={cn(input, "border-line")}
          >
            <option value="new">Brand new</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="p-summary">One-line summary</Label>
          <input
            id="p-summary"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            maxLength={300}
            placeholder="Titanium design, A19 Pro chip, 48 MP triple camera."
            className={cn(input, border(err("shortDescription")))}
          />
          <FieldError>{err("shortDescription")}</FieldError>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="p-description">Description</Label>
          <textarea
            id="p-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={5000}
            className={cn(input, "h-auto py-3", border(err("description")))}
          />
          <FieldError>{err("description")}</FieldError>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="p-highlights">Highlights (one per line, up to 6)</Label>
          <textarea
            id="p-highlights"
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            rows={3}
            placeholder={"Official Apple warranty\nFace ID\n5G"}
            className={cn(input, "h-auto py-3", border(err("highlights")))}
          />
          <FieldError>
            {err("highlights") ?? Object.entries(errors).find(([k]) => k.startsWith("highlights."))?.[1]}
          </FieldError>
        </div>
      </section>

      {template.length > 0 && (
        <section className="grid gap-4 rounded-[20px] border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3">
          <h2 className="font-display text-lg font-bold sm:col-span-2 lg:col-span-3">Specifications</h2>
          {template.map((f) => (
            <div key={f.key}>
              <Label htmlFor={`spec-${f.key}`}>
                {f.label}
                {f.unit ? ` (${f.unit})` : ""}
              </Label>
              {f.type === "select" ? (
                <select
                  id={`spec-${f.key}`}
                  value={specs[f.key] ?? ""}
                  onChange={(e) => setSpecs((s) => ({ ...s, [f.key]: e.target.value }))}
                  className={cn(input, border(err(`specs.${f.key}`)))}
                >
                  <option value="">—</option>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`spec-${f.key}`}
                  value={specs[f.key] ?? ""}
                  inputMode={f.type === "number" ? "decimal" : undefined}
                  maxLength={120}
                  onChange={(e) => setSpecs((s) => ({ ...s, [f.key]: e.target.value }))}
                  className={cn(input, border(err(`specs.${f.key}`)))}
                />
              )}
              <FieldError>{err(`specs.${f.key}`)}</FieldError>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Variants, prices and stock</h2>
          <Button
            type="button"
            variant="glass"
            size="sm"
            onClick={() => setVariants((v) => [...v, newRow()])}
          >
            <Plus aria-hidden /> Add variant
          </Button>
        </div>
        <FieldError>{err("variants")}</FieldError>
        {variants.map((v, i) => (
          <fieldset
            key={v.key}
            className="grid gap-3 rounded-2xl border border-line bg-white/3 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <legend className="sr-only">Variant {i + 1}</legend>
            {attrKeys.map((k) => {
              const field = template.find((f) => f.key === k);
              const id = `v${i}-${k}`;
              return (
                <div key={k}>
                  <Label htmlFor={id}>{field?.label ?? "Colour"}</Label>
                  {field?.type === "select" ? (
                    <select
                      id={id}
                      value={v.attributes[k] ?? ""}
                      onChange={(e) =>
                        setVariant(i, { attributes: { ...v.attributes, [k]: e.target.value } })
                      }
                      className={cn(input, "border-line")}
                    >
                      <option value="">—</option>
                      {field.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={id}
                      value={v.attributes[k] ?? ""}
                      maxLength={40}
                      placeholder="e.g. Silver"
                      onChange={(e) =>
                        setVariant(i, { attributes: { ...v.attributes, [k]: e.target.value } })
                      }
                      className={cn(input, "border-line")}
                    />
                  )}
                </div>
              );
            })}
            <div>
              <Label htmlFor={`v${i}-label`}>Variant name</Label>
              <input
                id={`v${i}-label`}
                value={v.label}
                maxLength={80}
                placeholder="Blank = the options above"
                onChange={(e) => setVariant(i, { label: e.target.value })}
                className={cn(input, border(err(`variants.${i}.label`)))}
              />
              <FieldError>{err(`variants.${i}.label`)}</FieldError>
            </div>
            <div>
              <Label htmlFor={`v${i}-sku`}>SKU</Label>
              <input
                id={`v${i}-sku`}
                value={v.sku}
                readOnly={v.saved}
                maxLength={64}
                placeholder="Blank = generated"
                onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })}
                className={cn(
                  input,
                  "font-mono uppercase",
                  v.saved && "opacity-70",
                  border(err(`variants.${i}.sku`)),
                )}
              />
              <FieldError>{err(`variants.${i}.sku`)}</FieldError>
            </div>
            <div>
              <Label htmlFor={`v${i}-price`}>Price (LKR)</Label>
              <input
                id={`v${i}-price`}
                value={v.price}
                inputMode="decimal"
                placeholder="389900"
                onChange={(e) => setVariant(i, { price: e.target.value })}
                className={cn(input, border(err(`variants.${i}.price`)))}
              />
              <FieldError>{err(`variants.${i}.price`)}</FieldError>
            </div>
            <div>
              <Label htmlFor={`v${i}-was`}>Was price (optional)</Label>
              <input
                id={`v${i}-was`}
                value={v.compareAt}
                inputMode="decimal"
                placeholder="419900"
                onChange={(e) => setVariant(i, { compareAt: e.target.value })}
                className={cn(input, border(err(`variants.${i}.compareAt`)))}
              />
              <FieldError>{err(`variants.${i}.compareAt`)}</FieldError>
            </div>
            {v.saved ? (
              <p className="self-end pb-3 text-[13px] text-text-secondary">
                {v.stock} on the shelf{v.reserved ? ` · ${v.reserved} reserved` : ""} — change it on the Stock
                page
              </p>
            ) : (
              <div>
                <Label htmlFor={`v${i}-stock`}>Opening stock</Label>
                <input
                  id={`v${i}-stock`}
                  value={v.stock}
                  inputMode="numeric"
                  onChange={(e) => setVariant(i, { stock: e.target.value })}
                  className={cn(input, border(err(`variants.${i}.stock`)))}
                />
                <FieldError>{err(`variants.${i}.stock`)}</FieldError>
              </div>
            )}
            <div className="flex items-end justify-between gap-3 sm:col-span-2 lg:col-span-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={v.isActive}
                  onChange={(e) => setVariant(i, { isActive: e.target.checked })}
                  className="size-4 accent-primary"
                />
                On sale
              </label>
              {variants.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={v.reserved > 0}
                  title={v.reserved > 0 ? "Reserved by open orders — turn it off instead" : undefined}
                  onClick={() => setVariants((rows) => rows.filter((_, j) => j !== i))}
                >
                  <Trash2 aria-hidden /> Remove
                </Button>
              )}
            </div>
          </fieldset>
        ))}
      </section>

      <section className="grid gap-4 rounded-[20px] border border-line bg-surface p-5 sm:grid-cols-3">
        <h2 className="font-display text-lg font-bold sm:col-span-3">Warranty and delivery</h2>
        <div>
          <Label htmlFor="p-wtype">Warranty from</Label>
          <select
            id="p-wtype"
            value={warrantyType}
            onChange={(e) => setWarrantyType(e.target.value as typeof warrantyType)}
            className={cn(input, border(err("warrantyType")))}
          >
            <option value="manufacturer">Manufacturer</option>
            <option value="shop">Our shop</option>
            <option value="none">No warranty</option>
          </select>
          <FieldError>{err("warrantyType")}</FieldError>
        </div>
        {warrantyType !== "none" && (
          <div>
            <Label htmlFor="p-wmonths">Months</Label>
            <input
              id="p-wmonths"
              value={warrantyMonths}
              inputMode="numeric"
              onChange={(e) => setWarrantyMonths(e.target.value)}
              className={cn(input, border(err("warrantyMonths")))}
            />
            <FieldError>{err("warrantyMonths")}</FieldError>
          </div>
        )}
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input
            type="checkbox"
            checked={freeDelivery}
            onChange={(e) => setFreeDelivery(e.target.checked)}
            className="size-4 accent-primary"
          />
          Free delivery
        </label>
      </section>

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={cn(
            "rounded-xl border px-4 py-3 text-[13px]",
            message.ok
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger",
          )}
        >
          {message.text}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : product ? "Save changes" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
