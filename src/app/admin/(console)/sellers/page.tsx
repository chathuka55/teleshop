import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileCheck2, FileX2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { adminSellers } from "@/modules/admin/session";
import type { AdminSellerRowDTO } from "@/modules/admin/types";

export const metadata: Metadata = { title: "Shops — Admin", robots: { index: false } };

type Props = { searchParams: Promise<{ status?: string }> };

const tabs: { key: AdminSellerRowDTO["status"]; label: string }[] = [
  { key: "pending", label: "To approve" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
];

/** Figma "A10 · Sellers — Approvals" (P7-T04). Oldest applications first. */
export default async function AdminSellersPage({ searchParams }: Props) {
  const raw = (await searchParams).status;
  const status = tabs.find((t) => t.key === raw)?.key ?? "pending";
  const rows = await adminSellers(status);
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Shops</h1>
      <nav
        aria-label="Filter shops"
        className="no-scrollbar mt-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-[14px] bg-white/4 p-1"
      >
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/sellers?status=${t.key}`}
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
          {status === "pending" ? "No applications waiting." : "None."}
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2.5">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/sellers/${s.id}`}
                className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{s.shopName}</span>
                  <span className="block text-[13px] text-text-secondary">
                    {s.ownerName} · {s.ownerEmail}
                  </span>
                  <span className="text-xs text-text-muted">
                    {s.city}, {s.district} · BR {s.businessRegNo} · applied {day(s.appliedAt)}
                  </span>
                </span>
                {s.hasDocument ? (
                  <FileCheck2 aria-label="Certificate uploaded" className="size-5 text-success" />
                ) : (
                  <FileX2 aria-label="No certificate" className="size-5 text-accent" />
                )}
                <ChevronRight aria-hidden className="size-4 text-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
