import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ClipboardCheck, PackageOpen, ScanBarcode, Truck } from "lucide-react";
import { sellerPackageStatus } from "@/components/seller/seller-status";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/guards";
import { cn } from "@/lib/utils/cn";
import { formatLKR } from "@/lib/utils/money";
import { listMyPackages } from "@/modules/fulfilment/seller";
import { countByTab } from "@/modules/fulfilment/tabs";

export const metadata: Metadata = { title: "Seller dashboard", robots: { index: false } };

/** Figma "S1 · Seller — Dashboard": what needs doing now, and the latest orders. */
export default async function SellerHomePage() {
  const user = await requireRole("seller");
  const packages = await listMyPackages();
  const counts = countByTab(packages);
  const missing = packages.filter((p) => p.status === "processing" && p.missingSerials > 0).length;
  const todo = [
    { label: "New orders to accept", n: counts.new, href: "/seller/orders?tab=new", icon: ClipboardCheck },
    { label: "Orders to pack", n: counts.packing, href: "/seller/orders?tab=packing", icon: PackageOpen },
    { label: "Need IMEI / serial", n: missing, href: "/seller/orders?tab=packing", icon: ScanBarcode },
    { label: "Waiting for courier", n: counts.ready, href: "/seller/orders?tab=ready", icon: Truck },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-text-secondary">Here&apos;s what needs your attention today.</p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="To do">
        {todo.map(({ label, n, href, icon: Icon }) => (
          <li key={label}>
            <Link
              href={href}
              className="flex h-full flex-col gap-3 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-xl",
                  n ? "bg-accent/15 text-accent" : "bg-white/6 text-text-muted",
                )}
              >
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="font-display text-3xl font-bold">{n}</span>
              <span className="text-[13px] text-text-secondary">{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="rounded-[20px] border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Recent orders</h2>
          <Link
            href="/seller/orders?tab=all"
            className="text-sm font-semibold text-primary-light hover:text-text"
          >
            All orders →
          </Link>
        </div>
        {packages.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            No orders yet. New orders appear here and you&apos;ll get an email for each one.
          </p>
        ) : (
          <ul className="flex flex-col">
            {packages.slice(0, 6).map((p) => {
              const s = sellerPackageStatus[p.status];
              return (
                <li key={p.orderNo} className="border-t border-line first:border-0">
                  <Link
                    href={`/seller/orders/${p.orderNo}`}
                    className="flex items-center gap-3 py-3 text-sm hover:text-primary-light"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {p.orderNo}
                        <Badge tone={s.tone} size="xs">
                          {s.label}
                        </Badge>
                      </span>
                      <span className="line-clamp-1 text-xs text-text-secondary">
                        {p.itemNames.join(", ")} · {p.city}
                      </span>
                    </span>
                    <span className="font-semibold">{formatLKR(p.amountCents)}</span>
                    <ChevronRight aria-hidden className="size-4 text-text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
