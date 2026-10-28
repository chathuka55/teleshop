import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductArt } from "@/components/product/ProductArt";
import { productStatus } from "@/components/seller/products/product-status";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { formatLKR } from "@/lib/utils/money";
import { adminProducts } from "@/modules/admin/session";
import type { ProductStatus } from "@/modules/products/types";

export const metadata: Metadata = { title: "Products — Admin", robots: { index: false } };

type Props = { searchParams: Promise<{ status?: string }> };

const tabs: { key: ProductStatus; label: string }[] = [
  { key: "pending_review", label: "To review" },
  { key: "published", label: "On sale" },
  { key: "draft", label: "Drafts" },
  { key: "inactive", label: "Off sale" },
  { key: "blocked", label: "Blocked" },
];

/** Figma "A5 · Admin — Products" moderation queue (P7-T03). Oldest first while reviewing. */
export default async function AdminProductsPage({ searchParams }: Props) {
  const raw = (await searchParams).status;
  const status = tabs.find((t) => t.key === raw)?.key ?? "pending_review";
  const rows = await adminProducts(status);

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Products</h1>
      <nav
        aria-label="Filter products"
        className="no-scrollbar mt-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-[14px] bg-white/4 p-1"
      >
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/products?status=${t.key}`}
            aria-current={t.key === status ? "page" : undefined}
            className={cn(
              "rounded-[10px] px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap",
              t.key === status ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="mt-6 rounded-[20px] border border-dashed border-line px-6 py-10 text-center text-sm text-text-secondary">
          {status === "pending_review" ? "Nothing to review." : "None."}
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2.5">
          {rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/products/${p.id}`}
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
                    <Badge tone={productStatus[p.status].tone} size="xs">
                      {productStatus[p.status].label}
                    </Badge>
                    {p.status === "pending_review" && (
                      <Badge tone="neutral" size="xs">
                        {p.wasPublished ? "Price change" : "New listing"}
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {p.shopName} · {p.categoryName}
                  </span>
                </span>
                <span className="font-semibold">{formatLKR(p.minPriceCents)}</span>
                <ChevronRight aria-hidden className="size-4 text-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
