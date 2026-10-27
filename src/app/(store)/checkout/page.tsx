import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { VerifyEmailBanner } from "@/components/forms/AccountForms";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getCurrentUser } from "@/lib/auth/guards";
import { listMyAddresses } from "@/modules/addresses/service";
import { getCheckoutOptions } from "@/modules/cart/service";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/**
 * Checkout (Figma 05 / M7, P4-T05): delivery address → delivery method → Cash on Delivery →
 * place order. Signed-in customers only; prices and totals always come from the server.
 */
export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fcheckout");
  const [addresses, options] = await Promise.all([listMyAddresses(), getCheckoutOptions()]);

  return (
    <div className="container-page pt-6 pb-16 md:pt-8">
      <Breadcrumbs items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mt-4 mb-6 font-display text-[30px] font-bold tracking-[-0.02em] md:text-[38px]">
        Checkout
      </h1>
      {!user.emailVerified && (
        <div className="mb-6">
          <VerifyEmailBanner email={user.email} />
        </div>
      )}
      <CheckoutForm
        addresses={addresses}
        fees={options.fees}
        canOrder={user.emailVerified && options.codEnabled}
        blockedReason={
          !user.emailVerified
            ? "Verify your email to place a Cash on Delivery order."
            : !options.codEnabled
              ? "Cash on Delivery is paused right now."
              : null
        }
      />
    </div>
  );
}
