import type { Metadata } from "next";
import { Store } from "lucide-react";
import { SellerCard } from "@/components/product/SellerCard";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { listSellers } from "@/modules/catalog/service";

export const metadata: Metadata = {
  title: "Verified sellers",
  description: "Mobile, computer and accessory shops verified by Teleshop.",
};

export default async function SellersPage() {
  const sellers = await listSellers();
  return (
    <div className="container-page pt-8 pb-16 md:pt-12">
      <SectionHeader
        eyebrow="Verified sellers"
        title="Shops on Teleshop"
        description="Every shop is checked before it can sell business registration, address and phone."
      >
        <ButtonLink href="/register/seller" variant="glass">
          <Store aria-hidden /> Sell on Teleshop
        </ButtonLink>
      </SectionHeader>
      <ul className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
        {sellers.map((s) => (
          <li key={s.id}>
            <SellerCard seller={s} />
          </li>
        ))}
      </ul>
    </div>
  );
}
