import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page pt-8 pb-16 md:pt-10">
      <h1 className="mb-6 font-display text-[32px] font-bold tracking-[-0.02em] md:text-[40px]">Your cart</h1>
      <CartView />
    </div>
  );
}
