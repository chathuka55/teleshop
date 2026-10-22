import type { Metadata } from "next";
import Link from "next/link";
import { TrackForm } from "@/components/orders/TrackForm";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Track a Teleshop order with your order number and phone number.",
};

/** Figma "14 · Track Order — Guest Lookup" (12:1926). */
export default function TrackPage() {
  return (
    <div className="container-page pt-12 pb-20 md:pt-16">
      <div className="mx-auto flex max-w-[700px] flex-col items-center">
        <Badge tone="primary" size="sm">
          ORDER TRACKING
        </Badge>
        <h1 className="mt-4 text-center font-display text-[34px] font-bold tracking-[-0.02em] md:text-[44px]">
          Track your order
        </h1>
        <p className="mt-2 text-center text-[15px] text-text-secondary">
          Enter your order number and the phone number used at checkout.
        </p>
        <div className="mt-8 w-full">
          <TrackForm />
        </div>
        <p className="mt-6 text-sm text-text-secondary">
          Have an account?{" "}
          <Link
            href="/sign-in?next=/account/orders"
            className="font-semibold text-primary-light hover:text-text"
          >
            Sign in to see all your orders
          </Link>
        </p>
      </div>
    </div>
  );
}
