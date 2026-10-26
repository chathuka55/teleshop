import Link from "next/link";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { SPEC_PARAM_PREFIX } from "@/modules/catalog/schema";
import type { BrandDTO, ProductPage, ProductQuery, SpecFilterDTO } from "@/modules/catalog/types";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { FilterForm } from "./FilterForm";
import { ProductCard } from "./ProductCard";
import { SortSelect } from "./SortSelect";

const conditions = [
  { value: "new", label: "Brand new" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Certified refurbished" },
] as const;

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

/** Figma "02 · Shop — Category Listing" (9:161). Filters are a GET form → URL state, no JS needed. */
export function ProductListing({
  title,
  subtitle,
  crumbs,
  basePath,
  query,
  page,
  brands,
  specFilters = [],
}: {
  title: string;
  subtitle: string;
  crumbs: readonly Crumb[];
  basePath: string;
  query: ProductQuery;
  page: ProductPage;
  brands: BrandDTO[];
  /** Filterable specs of the category (category pages only), e.g. Storage, RAM. */
  specFilters?: readonly SpecFilterDTO[];
}) {
  const start = query.cursor ? Number(query.cursor) : 0;
  const prevCursor = start > 0 ? Math.max(0, start - 12) : null;
  const active: { label: string; href: string }[] = [
    ...(query.brand ?? []).map((b) => ({
      label: brands.find((x) => x.slug === b)?.name ?? b,
      href: listingHref(
        basePath,
        { ...query, brand: query.brand?.filter((x) => x !== b) },
        { cursor: undefined },
      ),
    })),
    ...(query.condition ?? []).map((c) => ({
      label: conditions.find((x) => x.value === c)?.label ?? c,
      href: listingHref(basePath, { ...query, condition: query.condition?.filter((x) => x !== c) }),
    })),
    ...Object.entries(query.specs ?? {}).flatMap(([key, values]) =>
      values.map((value) => ({
        label: `${specFilters.find((f) => f.key === key)?.label ?? key}: ${value}`,
        href: listingHref(
          basePath,
          { ...query, specs: withoutSpec(query.specs, key, value) },
          { cursor: undefined },
        ),
      })),
    ),
    ...(query.inStock
      ? [{ label: "In stock", href: listingHref(basePath, { ...query, inStock: undefined }) }]
      : []),
    ...(query.minPriceCents !== undefined || query.maxPriceCents !== undefined
      ? [
          {
            label: "Price",
            href: listingHref(basePath, { ...query, minPriceCents: undefined, maxPriceCents: undefined }),
          },
        ]
      : []),
    ...(query.q ? [{ label: `“${query.q}”`, href: listingHref(basePath, { ...query, q: undefined }) }] : []),
  ];

  return (
    <div className="container-page pt-6 pb-16 md:pt-8">
      <Breadcrumbs items={crumbs} />

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-bold tracking-[-0.02em] md:text-[38px]">{title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        </div>
        <SortSelect value={query.sort ?? "featured"} />
      </div>

      <ul className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <li>
          <Link
            href={listingHref(basePath, { ...query, brand: undefined })}
            className={cn(
              "flex h-[34px] items-center rounded-full border px-4 text-[13px] whitespace-nowrap",
              !query.brand?.length
                ? "border-primary-light/50 bg-primary/15 text-primary-light"
                : "border-line text-text-secondary hover:text-text",
            )}
          >
            All brands
          </Link>
        </li>
        {brands.slice(0, 10).map((b) => {
          const on = query.brand?.includes(b.slug) ?? false;
          return (
            <li key={b.id}>
              <Link
                href={listingHref(
                  basePath,
                  { ...query, brand: on ? undefined : [b.slug] },
                  { cursor: undefined },
                )}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "flex h-[34px] items-center rounded-full border px-4 text-[13px] whitespace-nowrap",
                  on
                    ? "border-primary-light/50 bg-primary/15 text-primary-light"
                    : "border-line text-text-secondary hover:text-text",
                )}
              >
                {b.name}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="group/listing mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <details className="group rounded-[18px] lg:open:contents" open>
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-[18px] border border-line bg-surface px-4 py-3 lg:hidden">
            <span className="flex items-center gap-2 font-semibold">
              <SlidersHorizontal aria-hidden className="size-4 text-primary-light" /> Filters
            </span>
            <span className="text-xs text-text-secondary group-open:hidden">Show</span>
            <span className="hidden text-xs text-text-secondary group-open:inline">Hide</span>
          </summary>

          <FilterForm action={basePath} className="mt-3 flex flex-col gap-4 lg:mt-0">
            {query.q && <input type="hidden" name="q" value={query.q} />}
            {query.sort && query.sort !== "featured" && (
              <input type="hidden" name="sort" value={query.sort} />
            )}
            <div className="hidden items-center justify-between lg:flex">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <SlidersHorizontal aria-hidden className="size-[18px] text-primary-light" /> Filters
              </h2>
              <Link href={basePath} className="text-[13px] text-primary-light hover:text-text">
                Clear all
              </Link>
            </div>

            <fieldset className="rounded-[18px] border border-line bg-surface p-4">
              <legend className="float-left mb-3 w-full text-sm font-semibold">Price range (LKR)</legend>
              <div className="clear-both grid grid-cols-2 gap-2.5">
                <label className="rounded-xl border border-line bg-white/4 px-3 py-2">
                  <span className="block text-[11px] text-text-muted">Min</span>
                  <input
                    name="min"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    defaultValue={query.minPriceCents !== undefined ? query.minPriceCents / 100 : undefined}
                    placeholder="0"
                    className="w-full bg-transparent text-sm font-semibold outline-none"
                  />
                </label>
                <label className="rounded-xl border border-line bg-white/4 px-3 py-2">
                  <span className="block text-[11px] text-text-muted">Max</span>
                  <input
                    name="max"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    defaultValue={query.maxPriceCents !== undefined ? query.maxPriceCents / 100 : undefined}
                    placeholder="Any"
                    className="w-full bg-transparent text-sm font-semibold outline-none"
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-[18px] border border-line bg-surface p-4">
              <legend className="float-left mb-3 w-full text-sm font-semibold">Brand</legend>
              <BrandCheckboxes brands={brands} selected={query.brand ?? []} />
            </fieldset>

            {specFilters.map((f) => (
              <fieldset key={f.key} className="rounded-[18px] border border-line bg-surface p-4">
                <legend className="float-left mb-3 w-full text-sm font-semibold">{f.label}</legend>
                <div className="clear-both flex flex-wrap gap-2">
                  {f.options.map((option) => (
                    <label
                      key={option}
                      className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-[13px] text-text-secondary transition-colors hover:text-text has-checked:border-primary-light/50 has-checked:bg-primary/15 has-checked:text-primary-light"
                    >
                      <input
                        type="checkbox"
                        name={`${SPEC_PARAM_PREFIX}${f.key}`}
                        value={option}
                        defaultChecked={query.specs?.[f.key]?.includes(option)}
                        className="sr-only"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <fieldset className="rounded-[18px] border border-line bg-surface p-4">
              <legend className="float-left mb-3 w-full text-sm font-semibold">Condition</legend>
              <div className="clear-both flex flex-col gap-2.5">
                {conditions.map((c) => (
                  <label
                    key={c.value}
                    className="flex min-h-7 cursor-pointer items-center gap-2.5 text-[13px]"
                  >
                    <input
                      type="checkbox"
                      name="condition"
                      value={c.value}
                      defaultChecked={query.condition?.includes(c.value)}
                      className="size-4 accent-primary"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-[18px] border border-line bg-surface p-4">
              <legend className="float-left mb-3 w-full text-sm font-semibold">Availability</legend>
              <label className="clear-both flex min-h-7 cursor-pointer items-center justify-between text-[13px]">
                In stock only
                <input
                  type="checkbox"
                  name="inStock"
                  value="1"
                  defaultChecked={query.inStock}
                  className="size-4 accent-primary"
                />
              </label>
            </fieldset>

            <Button type="submit" className="w-full">
              Apply filters
            </Button>
          </FilterForm>
        </details>

        {/* Dims while new filter results load (FilterForm sets data-pending). */}
        <div className="transition-opacity duration-150 group-has-[form[data-pending]]/listing:pointer-events-none group-has-[form[data-pending]]/listing:opacity-50">
          {active.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-text-secondary">Active:</span>
              {active.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary-light/40 bg-primary/12 px-3 py-1 text-primary-light hover:bg-primary/20"
                >
                  {a.label}
                  <X aria-label="Remove filter" className="size-3" />
                </Link>
              ))}
              <Link href={basePath} className="text-primary-light hover:text-text">
                Clear all
              </Link>
            </div>
          )}

          {page.items.length ? (
            <ul className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-3">
              {page.items.map((p, i) => (
                <li key={p.id} className="flex [&>article]:flex-1">
                  <ProductCard product={p} priority={i < 3} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[20px] border border-line bg-surface p-10 text-center">
              <p className="font-semibold">No products match these filters.</p>
              <p className="mt-1 text-sm text-text-secondary">
                Try removing a filter or widening the price range.
              </p>
              <ButtonLink href={basePath} variant="glass" size="sm" className="mt-4">
                Clear filters
              </ButtonLink>
            </div>
          )}

          {(prevCursor !== null || page.nextCursor) && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
              {prevCursor !== null ? (
                <ButtonLink
                  href={listingHref(basePath, query, { cursor: prevCursor ? String(prevCursor) : undefined })}
                  variant="glass"
                  size="sm"
                >
                  <ChevronLeft aria-hidden /> Previous
                </ButtonLink>
              ) : null}
              <span className="text-[13px] text-text-secondary">
                {start + 1}–{start + page.items.length} of {page.total}
              </span>
              {page.nextCursor && (
                <ButtonLink
                  href={listingHref(basePath, query, { cursor: page.nextCursor })}
                  variant="glass"
                  size="sm"
                >
                  Next <ChevronRight aria-hidden />
                </ButtonLink>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandCheckboxes({ brands, selected }: { brands: BrandDTO[]; selected: readonly string[] }) {
  // `brand` is posted as repeated checkboxes; the page joins them (see normaliseListingParams).
  return (
    <div className="clear-both flex max-h-56 flex-col gap-2.5 overflow-y-auto">
      {brands.map((b) => (
        <label key={b.id} className="flex min-h-7 cursor-pointer items-center gap-2.5 text-[13px]">
          <input
            type="checkbox"
            name="brand"
            value={b.slug}
            defaultChecked={selected.includes(b.slug)}
            className="size-4 accent-primary"
          />
          {b.name}
        </label>
      ))}
    </div>
  );
}

/** The spec filters with one value removed (and the key dropped when it was the last one). */
function withoutSpec(specs: ProductQuery["specs"], key: string, value: string): ProductQuery["specs"] {
  const next = { ...specs };
  const left = (next[key] ?? []).filter((v) => v !== value);
  if (left.length) next[key] = left;
  else delete next[key];
  return Object.keys(next).length ? next : undefined;
}
