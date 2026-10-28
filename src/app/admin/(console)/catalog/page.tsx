import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus, ScanBarcode } from "lucide-react";
import { BrandForm } from "@/components/admin/ConfigForms";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { adminBrands, adminCategories } from "@/modules/admin/session";

export const metadata: Metadata = { title: "Catalog — Admin", robots: { index: false } };

/** Figma "A7 · Admin — Categories & brands" (P7-T03). */
export default async function AdminCatalogPage() {
  const [categories, brands] = await Promise.all([adminCategories(), adminBrands()]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Catalog</h1>

      <section className="rounded-[20px] border border-line bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Categories</h2>
          <ButtonLink href="/admin/catalog/categories/new" size="sm" variant="glass">
            <Plus aria-hidden /> Add category
          </ButtonLink>
        </div>
        <ul className="flex flex-col">
          {categories.map((c) => (
            <li key={c.id} className="border-t border-line first:border-0">
              <Link
                href={`/admin/catalog/categories/${c.id}`}
                className="flex items-center gap-3 py-3 text-sm hover:text-primary-light"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    {c.name}
                    {!c.isActive && (
                      <Badge tone="neutral" size="xs">
                        hidden
                      </Badge>
                    )}
                    {c.requiresSerial && (
                      <ScanBarcode aria-label="IMEI / serial required" className="size-4 text-text-muted" />
                    )}
                  </span>
                  <span className="text-xs text-text-secondary">
                    /c/{c.slug} · {c.specTemplate.length} spec field{c.specTemplate.length === 1 ? "" : "s"} ·{" "}
                    {c.products} product{c.products === 1 ? "" : "s"}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-4 text-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Brands</h2>
        <BrandForm />
        <ul className="flex flex-col gap-2">
          {brands.map((b) => (
            <li key={b.id} className="rounded-2xl border border-line bg-white/3 px-4 pt-1 pb-3">
              <BrandForm brand={b} />
              <p className="text-xs text-text-muted">
                /{b.slug} · {b.products} product{b.products === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
