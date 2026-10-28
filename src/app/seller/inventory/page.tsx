import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { ProductArt } from "@/components/product/ProductArt";
import { StockControls } from "@/components/seller/products/StockRow";
import { cn } from "@/lib/utils/cn";
import { listMyStock } from "@/modules/products/seller";

export const metadata: Metadata = { title: "Stock — Seller", robots: { index: false } };

type Props = { searchParams: Promise<{ low?: string }> };

/** Figma "S3 · Seller — Products & Stock" — stock per SKU with steppers (P6-T03). */
export default async function SellerStockPage({ searchParams }: Props) {
  const lowOnly = (await searchParams).low === "1";
  const all = await listMyStock();
  const low = all.filter((r) => r.isActive && r.available <= r.lowStockAt);
  const rows = lowOnly ? low : all;

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Stock</h1>
      <p className="text-sm text-text-secondary">
        On the shelf = units you have. Reserved = held for open orders. Buyers can order what&apos;s
        available.
      </p>
      <nav aria-label="Filter stock" className="mt-5 inline-flex gap-1 rounded-[14px] bg-white/4 p-1">
        {[
          { href: "/seller/inventory", label: `All SKUs (${all.length})`, active: !lowOnly },
          { href: "/seller/inventory?low=1", label: `Low stock (${low.length})`, active: lowOnly },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "rounded-[10px] px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap",
              t.active ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-[20px] border border-dashed border-line px-6 py-10 text-center text-sm text-text-secondary">
          {all.length === 0 ? "Add a product to start tracking stock." : "Nothing is running low."}
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2.5">
          {rows.map((r) => {
            const isLow = r.isActive && r.available <= r.lowStockAt;
            return (
              <li
                key={r.sku}
                className="flex flex-wrap items-center gap-4 rounded-[18px] border border-line bg-surface p-3.5"
              >
                <ProductArt
                  product={{
                    art: { kind: "phone", tint: "blue" },
                    imageUrl: r.imageUrl,
                    name: r.productName,
                  }}
                  size="sm"
                  artScale={0.4}
                  className="size-12 shrink-0 rounded-xl"
                />
                <span className="min-w-0 flex-1 text-sm">
                  <Link
                    href={`/seller/products/${r.productId}`}
                    className="line-clamp-1 font-semibold hover:text-primary-light"
                  >
                    {r.productName}
                  </Link>
                  <span className="text-xs text-text-secondary">
                    {r.label} · <span className="font-mono">{r.sku}</span>
                    {!r.isActive && " · off sale"}
                  </span>
                </span>
                <dl className="flex gap-4 text-center text-xs">
                  <div>
                    <dt className="text-text-muted">Reserved</dt>
                    <dd className="text-sm font-semibold">{r.reserved}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Available</dt>
                    <dd
                      className={cn(
                        "flex items-center justify-center gap-1 text-sm font-semibold",
                        isLow && "text-accent",
                      )}
                    >
                      {isLow && <AlertTriangle aria-label="Low stock" className="size-3.5" />}
                      {r.available}
                    </dd>
                  </div>
                </dl>
                <StockControls key={`${r.sku}-${r.onHand}`} row={r} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
