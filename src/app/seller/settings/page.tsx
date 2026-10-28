import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ShopCoverForm, ShopSettingsForm } from "@/components/seller/ShopSettingsForm";
import { getMyShopSettings } from "@/modules/sellers/seller";

export const metadata: Metadata = { title: "Shop settings — Seller", robots: { index: false } };

/** Figma "S4 · Seller — Payouts & Shop Settings" — settings (P6-T05). */
export default async function ShopSettingsPage() {
  const shop = await getMyShopSettings();
  if (!shop) notFound();
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          Shop settings
        </h1>
        <p className="text-sm text-text-secondary">
          {shop.shopName} · shown to buyers on{" "}
          <Link
            href={`/s/${shop.slug}`}
            className="inline-flex items-center gap-1 font-semibold text-primary-light hover:text-text"
          >
            your shop page <ExternalLink aria-hidden className="size-3.5" />
          </Link>
          . To change the shop name or business registration, contact support.
        </p>
      </header>
      <ShopCoverForm coverUrl={shop.coverUrl} shopName={shop.shopName} />
      <ShopSettingsForm shop={shop} />
    </div>
  );
}
