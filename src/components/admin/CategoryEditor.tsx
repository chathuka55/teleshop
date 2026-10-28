"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveCategoryAction } from "@/modules/admin/config-actions";
import { categoryIcons } from "@/modules/admin/config-schema";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";

type Field = {
  uid: number;
  key: string;
  label: string;
  type: "text" | "number" | "select";
  unit: string;
  options: string;
  filterable: boolean;
  saved: boolean;
};

export type CategoryEditorValue = {
  id: string;
  name: string;
  icon: (typeof categoryIcons)[number];
  requiresSerial: boolean;
  isActive: boolean;
  sortOrder: number;
  specTemplate: {
    key: string;
    label: string;
    type: Field["type"];
    unit: string;
    options: string[];
    filterable: boolean;
  }[];
};

const input =
  "h-10 w-full rounded-xl border bg-white/4 px-3 text-sm outline-none placeholder:text-text-muted focus:border-primary-light/60";
const border = (e?: string) => (e ? "border-danger/60" : "border-line");

/** "Battery life" → "batteryLife" — the stored key for a new field. */
const keyFrom = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""))
    .replace(/^[^a-z]+/, "")
    .slice(0, 31);

let seq = 0;

/** Category details + spec template (A7). Products in the category fill these fields. */
export function CategoryEditor({
  category,
  productCount,
}: {
  category?: CategoryEditorValue;
  productCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState<CategoryEditorValue["icon"]>(category?.icon ?? "phone");
  const [requiresSerial, setRequiresSerial] = useState(category?.requiresSerial ?? false);
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [fields, setFields] = useState<Field[]>(
    (category?.specTemplate ?? []).map((f) => ({
      ...f,
      uid: ++seq,
      options: f.options.join(", "),
      saved: true,
    })),
  );
  const err = (p: string) => errors[p];
  const set = (i: number, patch: Partial<Field>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: -1 | 1) =>
    setFields((fs) => {
      const next = [...fs];
      const [x] = next.splice(i, 1);
      if (x) next.splice(i + d, 0, x);
      return next;
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const r = await saveCategoryAction({
        id: category?.id ?? "",
        name,
        icon,
        requiresSerial,
        isActive,
        sortOrder,
        specTemplate: fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          unit: f.unit,
          options:
            f.type === "select"
              ? f.options
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
              : [],
          filterable: f.filterable,
        })),
      });
      setErrors(r.ok ? {} : (r.fields ?? {}));
      if (!r.ok) {
        setMessage({ ok: false, text: r.message });
        return;
      }
      if (!category && r.id) {
        router.push(`/admin/catalog/categories/${r.id}?created=1`);
        return;
      }
      setMessage({ ok: true, text: r.message });
      setFields((fs) => fs.map((f) => ({ ...f, saved: true })));
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <section className="grid gap-4 rounded-[20px] border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="c-name" className="mb-1.5 block text-[13px] text-text-secondary">
            Name
          </label>
          <input
            id="c-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className={cn(input, border(err("name")))}
          />
          <FieldError>{err("name")}</FieldError>
        </div>
        <div>
          <label htmlFor="c-icon" className="mb-1.5 block text-[13px] text-text-secondary">
            Icon
          </label>
          <select
            id="c-icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value as CategoryEditorValue["icon"])}
            className={cn(input, "border-line")}
          >
            {categoryIcons.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="c-sort" className="mb-1.5 block text-[13px] text-text-secondary">
            Order in menus
          </label>
          <input
            id="c-sort"
            value={sortOrder}
            inputMode="numeric"
            onChange={(e) => setSortOrder(e.target.value)}
            className={cn(input, border(err("sortOrder")))}
          />
          <FieldError>{err("sortOrder")}</FieldError>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={requiresSerial}
            onChange={(e) => setRequiresSerial(e.target.checked)}
            className="size-4 accent-primary"
          />
          Shops must record an IMEI / serial for each unit before shipping
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 accent-primary"
          />
          Shown in the store and to sellers
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Specification fields</h2>
            <p className="text-[13px] text-text-secondary">
              What sellers fill in for each product
              {productCount ? ` (${productCount} products use this category)` : ""}. Lists can be shown as
              filters in the store.
            </p>
          </div>
          <Button
            type="button"
            variant="glass"
            size="sm"
            onClick={() =>
              setFields((fs) => [
                ...fs,
                {
                  uid: ++seq,
                  key: "",
                  label: "",
                  type: "text",
                  unit: "",
                  options: "",
                  filterable: false,
                  saved: false,
                },
              ])
            }
          >
            <Plus aria-hidden /> Add field
          </Button>
        </div>
        <FieldError>{err("specTemplate")}</FieldError>
        {fields.length === 0 && <p className="text-sm text-text-secondary">No fields yet.</p>}
        {fields.map((f, i) => (
          <fieldset
            key={f.uid}
            className="grid gap-3 rounded-2xl border border-line bg-white/3 p-3.5 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.8fr_0.6fr]"
          >
            <legend className="sr-only">Field {i + 1}</legend>
            <div>
              <label htmlFor={`f${f.uid}-label`} className="mb-1 block text-xs text-text-secondary">
                Label
              </label>
              <input
                id={`f${f.uid}-label`}
                value={f.label}
                maxLength={40}
                placeholder="Battery life"
                onChange={(e) =>
                  set(i, { label: e.target.value, ...(f.saved ? {} : { key: keyFrom(e.target.value) }) })
                }
                className={cn(input, border(err(`specTemplate.${i}.label`)))}
              />
              <FieldError>{err(`specTemplate.${i}.label`)}</FieldError>
            </div>
            <div>
              <label htmlFor={`f${f.uid}-key`} className="mb-1 block text-xs text-text-secondary">
                Key{" "}
                {f.saved && <span className="text-text-muted">(fixed — products store values under it)</span>}
              </label>
              <input
                id={`f${f.uid}-key`}
                value={f.key}
                readOnly={f.saved}
                maxLength={31}
                onChange={(e) => set(i, { key: e.target.value })}
                className={cn(
                  input,
                  "font-mono",
                  f.saved && "opacity-70",
                  border(err(`specTemplate.${i}.key`)),
                )}
              />
              <FieldError>{err(`specTemplate.${i}.key`)}</FieldError>
            </div>
            <div>
              <label htmlFor={`f${f.uid}-type`} className="mb-1 block text-xs text-text-secondary">
                Type
              </label>
              <select
                id={`f${f.uid}-type`}
                value={f.type}
                onChange={(e) =>
                  set(i, {
                    type: e.target.value as Field["type"],
                    filterable: e.target.value === "select" && f.filterable,
                  })
                }
                className={cn(input, "border-line")}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">List of choices</option>
              </select>
            </div>
            <div>
              <label htmlFor={`f${f.uid}-unit`} className="mb-1 block text-xs text-text-secondary">
                Unit
              </label>
              <input
                id={`f${f.uid}-unit`}
                value={f.unit}
                maxLength={12}
                placeholder="e.g. mAh"
                onChange={(e) => set(i, { unit: e.target.value })}
                className={cn(input, "border-line")}
              />
            </div>
            {f.type === "select" && (
              <div className="sm:col-span-2 lg:col-span-3">
                <label htmlFor={`f${f.uid}-options`} className="mb-1 block text-xs text-text-secondary">
                  Choices, separated by commas
                </label>
                <input
                  id={`f${f.uid}-options`}
                  value={f.options}
                  placeholder="128GB, 256GB, 512GB, 1TB"
                  onChange={(e) => set(i, { options: e.target.value })}
                  className={cn(input, border(err(`specTemplate.${i}.options`)))}
                />
                <FieldError>{err(`specTemplate.${i}.options`)}</FieldError>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 lg:col-span-4">
              <label className={cn("flex items-center gap-2 text-sm", f.type !== "select" && "opacity-50")}>
                <input
                  type="checkbox"
                  checked={f.filterable}
                  disabled={f.type !== "select"}
                  onChange={(e) => set(i, { filterable: e.target.checked })}
                  className="size-4 accent-primary"
                />
                Filter in the store
              </label>
              <span className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Move ${f.label || "field"} up`}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === fields.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Move ${f.label || "field"} down`}
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}
                  aria-label={`Remove ${f.label || "field"}`}
                >
                  <Trash2 aria-hidden />
                </Button>
              </span>
            </div>
          </fieldset>
        ))}
        {fields.some((f) => f.saved) && (
          <p className="text-xs text-text-muted">
            Removing a field hides it on product pages; products keep the old value until the seller saves
            them again.
          </p>
        )}
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
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : category ? "Save category" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
