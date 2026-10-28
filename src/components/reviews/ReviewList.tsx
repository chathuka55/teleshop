import { BadgeCheck, Store } from "lucide-react";
import type { ProductReviewDTO } from "@/modules/reviews/types";
import { Stars } from "@/components/product/Rating";

/** Published reviews on the product page (P5-T05). Plain text only — React escapes everything. */
export function ReviewList({ reviews }: { reviews: readonly ProductReviewDTO[] }) {
  if (!reviews.length) {
    return (
      <p className="mt-5 rounded-xl border border-dashed border-line p-4 text-center text-[13px] text-text-secondary">
        No written reviews yet. Buyers can review this item once it&apos;s delivered.
      </p>
    );
  }
  return (
    <ul className="mt-5 flex flex-col gap-4">
      {reviews.map((r) => (
        <li key={r.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars value={r.rating} />
            {r.title && <p className="text-sm font-semibold">{r.title}</p>}
          </div>
          {r.comment && (
            <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-text-secondary">
              {r.comment}
            </p>
          )}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
            {r.authorName}
            <span className="inline-flex items-center gap-1 text-success">
              <BadgeCheck aria-hidden className="size-3.5" /> Verified purchase
            </span>
            ·
            <time dateTime={r.createdAt}>
              {new Date(r.createdAt).toLocaleDateString("en-LK", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </time>
          </p>
          {r.sellerReply && (
            <p className="mt-2 flex gap-2 rounded-xl bg-white/4 px-3 py-2 text-[13px] text-text-secondary">
              <Store aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-semibold text-text">Reply from the shop: </span>
                {r.sellerReply}
              </span>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
