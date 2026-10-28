import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileX2, ShieldCheck } from "lucide-react";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { Badge } from "@/components/ui/Badge";
import { formatPhoneLK } from "@/lib/utils/strings";
import { objectId } from "@/lib/validation/common";
import { adminSeller } from "@/modules/admin/session";
import { shopTypes } from "@/modules/auth/schema";

export const metadata: Metadata = { title: "Shop — Admin", robots: { index: false } };

type Props = { params: Promise<{ sellerId: string }> };

const tone = { pending: "accent", approved: "success", rejected: "danger", suspended: "danger" } as const;

/** One application (A10): details, the certificate (decrypted on download, ADR-006), decision. */
export default async function AdminSellerPage({ params }: Props) {
  const id = objectId.safeParse((await params).sellerId);
  if (!id.success) notFound();
  const s = await adminSeller(id.data);
  if (!s) notFound();
  const allowed = {
    pending: s.hasDocument ? ["approve", "reject"] : ["reject"],
    approved: ["suspend"],
    suspended: ["reinstate"],
    rejected: [],
  }[s.status];
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });
  const rows: [string, string][] = [
    ["Owner", `${s.ownerName} · ${s.ownerEmail}${s.ownerEmailVerified ? "" : " (email not verified)"}`],
    ["Shop type", shopTypes.find((t) => t.value === s.shopType)?.label ?? s.shopType],
    ["Business reg. no.", s.businessRegNo],
    ["Address", `${s.addressLine1}, ${s.city}, ${s.district}${s.postalCode ? ` ${s.postalCode}` : ""}`],
    ["Phone", formatPhoneLK(s.phone)],
    ["Applied", day(s.appliedAt)],
    ...(s.approvedAt ? ([["Approved", day(s.approvedAt)]] as [string, string][]) : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] text-text-secondary">
          <Link href={`/admin/sellers?status=${s.status}`} className="hover:text-text">
            Shops
          </Link>{" "}
          / {s.shopName}
        </p>
        <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          {s.shopName}
          <Badge tone={tone[s.status]}>{s.status}</Badge>
        </h1>
        {s.status === "approved" && (
          <Link href={`/s/${s.slug}`} className="text-sm font-semibold text-primary-light hover:text-text">
            Open shop page →
          </Link>
        )}
      </header>

      <section className="rounded-[20px] border border-line bg-surface p-5">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[160px_1fr]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-text-secondary">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {s.rejectionReason && (
          <p className="mt-4 rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm">
            Rejected: {s.rejectionReason}
          </p>
        )}
      </section>

      <section className="flex flex-wrap items-center gap-4 rounded-[20px] border border-line bg-surface p-5">
        {s.document ? (
          <>
            <ShieldCheck aria-hidden className="size-6 text-success" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">Business registration certificate</p>
              <p className="text-text-secondary">
                {s.document.contentType === "application/pdf" ? "PDF" : "Photo"} ·{" "}
                {Math.max(1, Math.round(s.document.size / 1024))} KB · uploaded {day(s.document.uploadedAt)} ·
                stored encrypted; each download is logged
              </p>
            </div>
            <a
              href={`/admin/sellers/${s.id}/document`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-white/6 px-4 text-sm font-semibold hover:bg-white/10"
            >
              <Download aria-hidden className="size-4" /> Download
            </a>
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-accent">
            <FileX2 aria-hidden className="size-5" /> No certificate uploaded — ask the owner to re-apply with
            it.
          </p>
        )}
      </section>

      {/* Always mounted: after the last decision the form shows its result instead of buttons. */}
      <section
        className={allowed.length ? "rounded-[20px] border border-line bg-surface p-5" : "empty:hidden"}
      >
        {allowed.length > 0 && (
          <h2 className="mb-3 font-display text-lg font-bold">
            {s.status === "pending" ? "Decision" : "Shop status"}
          </h2>
        )}
        {s.status === "approved" && (
          <p className="mb-3 text-sm text-text-secondary">
            Suspending hides every product from the store and closes the seller dashboard. Open orders stay —
            handle them under Orders.
          </p>
        )}
        {s.status === "suspended" && s.rejectionReason && (
          <p className="mb-3 text-sm text-text-secondary">Suspended because: {s.rejectionReason}</p>
        )}
        <DecisionForm kind="seller" id={s.id} allowed={allowed} />
      </section>
    </div>
  );
}
