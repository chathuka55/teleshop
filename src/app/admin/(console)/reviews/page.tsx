import type { Metadata } from "next";
import Link from "next/link";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { DoneBanner } from "@/components/admin/DoneBanner";
import { Pager, queryHref } from "@/components/admin/Pager";
import { Stars } from "@/components/product/Rating";
import { cn } from "@/lib/utils/cn";
import { adminReviews } from "@/modules/admin/session";

export const metadata: Metadata = { title: "Reviews — Admin", robots: { index: false } };

type Props = { searchParams: Promise<{ status?: string; page?: string; done?: string }> };

const done = {
  hidden: "Review hidden. The product and shop ratings no longer count it.",
  shown: "Review is visible again and counts towards the ratings.",
} as const;

const tabs = [
  { key: "visible", label: "Live" },
  { key: "hidden", label: "Hidden" },
] as const;

/** Figma "A11 · Admin — Reviews" (P7-T04): newest first, hide / show (ratings follow). */
export default async function AdminReviewsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = tabs.find((t) => t.key === sp.status)?.key ?? "visible";
  const page = Math.min(10_000, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  const { rows, total, pageSize } = await adminReviews(status, page);

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Reviews</h1>
      <p className="text-sm text-text-secondary">
        Every review is a verified purchase. Hide spam, abuse or personal details — the product and shop
        ratings stop counting a hidden review.
      </p>
      <div className="mt-4">
        <DoneBanner message={sp.done === "hidden" || sp.done === "shown" ? done[sp.done] : undefined} />
      </div>
      <nav aria-label="Filter reviews" className="mt-5 flex w-fit gap-1 rounded-[14px] bg-white/4 p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={queryHref("/admin/reviews", { status: t.key === "visible" ? undefined : t.key })}
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
          {status === "hidden" ? "No hidden reviews." : "No reviews yet."}
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4 md:flex-row"
            >
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} />
                  {r.title && <span className="font-semibold">{r.title}</span>}
                </div>
                {r.comment && <p className="mt-1.5 whitespace-pre-line text-text-secondary">{r.comment}</p>}
                <p className="mt-2 text-xs text-text-muted">
                  {r.customerName} ({r.customerEmail}) on{" "}
                  {r.productSlug ? (
                    <Link href={`/p/${r.productSlug}#reviews`} className="text-primary-light hover:text-text">
                      {r.productName}
                    </Link>
                  ) : (
                    r.productName
                  )}{" "}
                  · {r.shopName} ·{" "}
                  <Link href={`/admin/orders/${r.orderNo}`} className="hover:text-text">
                    {r.orderNo}
                  </Link>{" "}
                  ·{" "}
                  {new Date(r.createdAt).toLocaleDateString("en-LK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="md:max-w-xs">
                <DecisionForm kind="review" id={r.id} allowed={r.status === "hidden" ? ["show"] : ["hide"]} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager
        page={page}
        total={total}
        pageSize={pageSize}
        noun="reviews"
        href={(p) =>
          queryHref("/admin/reviews", { status: status === "visible" ? undefined : status, page: p })
        }
      />
    </div>
  );
}
