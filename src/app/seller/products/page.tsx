import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Plus } from "lucide-react";
import { ProductArt } from "@/components/product/ProductArt";
import { productStatus } from "@/components/seller/products/product-status";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { formatLKR } from "@/lib/utils/money";
import { listMyProducts } from "@/modules/products/seller";
import type { ProductStatus } from "@/modules/products/types";

export const metadata: Metadata = { title: "Products — Seller", robots: { index: false } };

type Props = { searchParams: Promise<{ status?: string; q?: string }> };

const tabs: { key: ProductStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "published", label: "On sale" },
  { key: "pending_review", label: "In review" },
  { key: "draft", label: "Drafts" },
  { key: "inactive", label: "Off sale" },
];

/** Figma "S3 · Seller — Products & Stock" — product list (P6-T03). */
export default async function SellerProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = tabs.find((t) => t.key === sp.status)?.key ?? "all";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const all = await listMyProducts();
  const rows = all.filter(
    (p) => (tab === "all" || p.status === tab) && (!q || p.name.toLowerCase().includes(q.toLowerCase())),
  );
  const count = (k: (typeof tabs)[number]["key"]) =>
    k === "all" ? all.length : all.filter((p) => p.status === k).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Products</h1>
        <ButtonLink href="/seller/products/new">
          <Plus aria-hidden /> Add product
        </ButtonLink>
      </div>
      <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <nav
          aria-label="Filter products"
          className="no-scrollbar flex gap-1 overflow-x-auto rounded-[14px] bg-white/4 p-1"
        >
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.key === "all" ? "/seller/products" : `/seller/products?status=${t.key}`}
              aria-current={t.key === tab ? "page" : undefined}
              className={cn(
                "rounded-[10px] px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap",
                t.key === tab ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text",
              )}
            >
              {t.label} <span className="opacity-70">{count(t.key)}</span>
            </Link>
          ))}
        </nav>
        <form action="/seller/products" role="search" className="xl:w-64">
          {tab !== "all" && <input type="hidden" name="status" value={tab} />}
          <label className="flex h-11 items-center gap-2.5 rounded-[14px] border border-line bg-white/4 px-4 focus-within:border-primary-light/60">
            <span className="sr-only">Search products</span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              maxLength={60}
              placeholder="Search your products"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
            />
          </label>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-[20px] border border-dashed border-line px-6 py-10 text-center text-sm text-text-secondary">
          {all.length === 0 ? (
            <>
              <p>You haven&apos;t listed any products yet.</p>
              <ButtonLink href="/seller/products/new" className="mt-4">
                <Plus aria-hidden /> Add your first product
              </ButtonLink>
            </>
          ) : (
            "No products match."
          )}
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {rows.map((p) => {
            const s = productStatus[p.status];
            return (
              <li key={p.id}>
                <Link
                  href={`/seller/products/${p.id}`}
                  className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                >
                  <ProductArt
                    product={{ art: { kind: "phone", tint: "blue" }, imageUrl: p.imageUrl, name: p.name }}
                    size="sm"
                    artScale={0.4}
                    className="size-14 shrink-0 rounded-xl"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="line-clamp-1 font-semibold">{p.name}</span>
                      <Badge tone={s.tone} size="xs">
                        {s.label}
                      </Badge>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
                      {p.variantCount} variant{p.variantCount === 1 ? "" : "s"} · {p.available} available
                      {p.lowStock && (
                        <span className="inline-flex items-center gap-1 text-accent">
                          <AlertTriangle aria-hidden className="size-3.5" /> Low stock
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-right text-sm font-semibold">
                    {formatLKR(p.minPriceCents)}
                    {p.maxPriceCents > p.minPriceCents && (
                      <span className="block text-xs font-normal text-text-secondary">
                        to {formatLKR(p.maxPriceCents)}
                      </span>
                    )}
                  </span>
                  <ChevronRight aria-hidden className="size-4 text-text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
