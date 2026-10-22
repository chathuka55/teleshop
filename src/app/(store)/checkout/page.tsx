import type { Metadata } from "next";
import { Lock, ShoppingCart } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/**
 * Checkout (Figma 05 / M7) needs a signed-in, email-verified customer and the placeOrder
 * transaction (P4-T04/T05). Until auth + database are connected it points back to the cart.
 */
export default function CheckoutPage() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16">
      <div className="flex max-w-md flex-col items-center rounded-[22px] border border-line bg-surface p-8 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary-light">
          <Lock aria-hidden className="size-6" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold">Sign in to check out</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Cash on Delivery orders need an account with a verified email and phone, so the shop and courier can
          reach you.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/sign-in?next=/checkout">Sign in</ButtonLink>
          <ButtonLink href="/cart" variant="glass">
            <ShoppingCart aria-hidden /> Back to cart
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
