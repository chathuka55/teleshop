import { ArrowRight, ShieldCheck } from "lucide-react";
import type { SellerCardDTO } from "@/modules/catalog/types";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

/** Figma "Shop/iStore Colombo" (7:982). */
export function SellerCard({ seller }: { seller: SellerCardDTO }) {
  const [from, to] = seller.gradient;
  return (
    <article className="flex flex-col gap-5 rounded-[22px] border border-white/7 bg-surface p-6">
      <div className="flex items-center gap-3.5">
        <span
          className="grid size-[60px] shrink-0 place-items-center rounded-[18px] font-display text-[22px] font-bold"
          style={{ backgroundImage: `linear-gradient(135deg, ${from} 0%, ${to} 71%)` }}
        >
          {seller.initials}
        </span>
        <div>
          <h3 className="flex items-center gap-2 font-display text-[19px] font-bold">
            {seller.shopName}
            <ShieldCheck aria-label="Verified seller" className="size-4 text-success" />
          </h3>
          <p className="text-[13px] text-text-secondary">
            {seller.shopTypeLabel} · {seller.city}
          </p>
        </div>
      </div>
      <dl className="flex justify-between rounded-[14px] bg-white/3 p-4 text-center">
        {[
          { label: "Rating", value: `${seller.rating.average.toFixed(1)} ★` },
          { label: "Products", value: seller.productCount.toLocaleString("en-LK") },
          { label: "Since", value: String(seller.since) },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5">
            <dt className="order-2 text-xs text-text-secondary">{s.label}</dt>
            <dd className="order-1 font-display text-lg font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-wrap gap-2">
        {seller.tags.map((t) => (
          <li key={t}>
            <Badge>{t}</Badge>
          </li>
        ))}
      </ul>
      <ButtonLink href={`/s/${seller.slug}`} variant="glass" className="w-full">
        Visit shop
        <ArrowRight aria-hidden />
      </ButtonLink>
    </article>
  );
}
