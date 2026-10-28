import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search, Zap } from "lucide-react";
import { ProductArt } from "@/components/product/ProductArt";
import { sellerPackageStatus } from "@/components/seller/seller-status";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { formatLKR } from "@/lib/utils/money";
import { listMyPackages } from "@/modules/fulfilment/seller";
import {
  countByTab,
  inSellerTab,
  parseSellerOrderTab,
  sellerOrderTabs,
  type SellerOrderTab,
} from "@/modules/fulfilment/tabs";

export const metadata: Metadata = { title: "Orders — Seller", robots: { index: false } };

type Props = { searchParams: Promise<{ tab?: string; q?: string }> };

const when = (iso: string): string =>
  new Date(iso).toLocaleString("en-LK", {
    timeZone: "Asia/Colombo",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const tabHref = (tab: SellerOrderTab, q: string): string => {
  const params = new URLSearchParams({ tab });
  if (q) params.set("q", q);
  return `/seller/orders?${params.toString()}`;
};

const itemsLine = (names: readonly string[]): string =>
  names.length > 1 ? `${names[0]} + ${names.length - 1} more` : (names[0] ?? "");

/** Figma "S2 · Seller — Orders & Fulfilment" — list (P6-T04). */
export default async function SellerOrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = parseSellerOrderTab(sp.tab);
  const q = (sp.q ?? "").trim().slice(0, 60);
  const needle = q.toLowerCase();
  const all = await listMyPackages();
  const counts = countByTab(all);
  const rows = all.filter(
    (p) =>
      inSellerTab(tab, p.status) &&
      (!needle ||
        p.orderNo.toLowerCase().includes(needle) ||
        p.itemNames.some((n) => n.toLowerCase().includes(needle))),
  );

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Orders</h1>
      <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <nav
          aria-label="Filter orders"
          className="no-scrollbar flex gap-1 overflow-x-auto rounded-[14px] bg-white/4 p-1"
        >
          {(Object.keys(sellerOrderTabs) as SellerOrderTab[]).map((t) => (
            <Link
              key={t}
              href={tabHref(t, q)}
              aria-current={t === tab ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap",
                t === tab ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text",
              )}
            >
              {sellerOrderTabs[t].label}
              {t !== "all" && counts[t] > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px]",
                    t === tab ? "bg-white/20" : t === "new" ? "bg-accent text-[#0b1220]" : "bg-white/10",
                  )}
                >
                  {counts[t]}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <form action="/seller/orders" role="search" className="xl:w-64">
          <input type="hidden" name="tab" value={tab} />
          <label className="flex h-11 items-center gap-2.5 rounded-[14px] border border-line bg-white/4 px-4 focus-within:border-primary-light/60">
            <Search aria-hidden className="size-4 text-text-muted" />
            <span className="sr-only">Search orders</span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              maxLength={60}
              placeholder="Order number or product"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
            />
          </label>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-[20px] border border-dashed border-line px-6 py-10 text-center text-sm text-text-secondary">
          {all.length === 0
            ? "No orders yet. You'll get an email for each new order."
            : `Nothing in “${sellerOrderTabs[tab].label}”${q ? ` matching “${q}”` : ""}.`}
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {rows.map((p) => {
            const s = sellerPackageStatus[p.status];
            return (
              <li key={p.orderNo}>
                <Link
                  href={`/seller/orders/${p.orderNo}`}
                  className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                >
                  <ProductArt
                    product={{
                      art: { kind: "phone", tint: "blue" },
                      imageUrl: p.imageUrl,
                      name: p.itemNames[0] ?? p.orderNo,
                    }}
                    size="sm"
                    artScale={0.4}
                    className="size-14 shrink-0 rounded-xl"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {p.orderNo}
                      <Badge tone={s.tone} size="xs">
                        {s.label}
                      </Badge>
                      {p.deliveryMethod === "express" && (
                        <Badge tone="accent" size="xs">
                          <Zap aria-hidden className="size-3" /> Express
                        </Badge>
                      )}
                    </span>
                    <span className="line-clamp-1 text-[13px]">{itemsLine(p.itemNames)}</span>
                    <span className="text-xs text-text-secondary">
                      {when(p.placedAt)} · {p.itemCount} item{p.itemCount === 1 ? "" : "s"} · {p.city},{" "}
                      {p.district}
                      {p.status === "processing" && p.missingSerials > 0 && (
                        <span className="text-accent"> · {p.missingSerials} IMEI/serial missing</span>
                      )}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold">{formatLKR(p.amountCents)}</span>
                    <span className="text-[11px] text-text-muted">COD</span>
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
