"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Banknote, Check, Loader2, Lock, MapPin, Plus, Truck, Zap } from "lucide-react";
import { AddressForm } from "@/components/forms/AddressForm";
import { ProductArt } from "@/components/product/ProductArt";
import { Button, ButtonLink } from "@/components/ui/Button";
import { syncCartNow, useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils/cn";
import { formatLKR } from "@/lib/utils/money";
import { formatPhoneLK } from "@/lib/utils/strings";
import type { AddressDTO } from "@/modules/addresses/types";
import { priceCheckoutAction } from "@/modules/cart/actions";
import type { DeliveryMethod, PricedCartDTO } from "@/modules/cart/types";
import { placeOrderAction } from "@/modules/orders/actions";

const methods: readonly { value: DeliveryMethod; label: string; note: string; icon: typeof Truck }[] = [
  { value: "standard", label: "Standard delivery", note: "2–4 working days island-wide", icon: Truck },
  { value: "express", label: "Express delivery", note: "Next working day in most cities", icon: Zap },
];

/**
 * Checkout steps (Figma 05): 1 address · 2 delivery · 3 payment (COD) · summary + place order.
 * The browser cart is merged into the account cart first; every amount shown comes from
 * priceCheckoutAction and placeOrder re-prices again on the server.
 */
export function CheckoutForm({
  addresses,
  fees,
  canOrder,
  blockedReason,
}: {
  addresses: AddressDTO[];
  fees: Record<DeliveryMethod, number>;
  canOrder: boolean;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const { clear } = useCart();
  const [addressId, setAddressId] = useState(
    () => addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "",
  );
  const [adding, setAdding] = useState(addresses.length === 0);
  const [method, setMethod] = useState<DeliveryMethod>("standard");
  const [cart, setCart] = useState<PricedCartDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // One key per checkout visit: double clicks and retries can never create two orders.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [placing, startPlacing] = useTransition();

  const reprice = useCallback(async (m: DeliveryMethod) => {
    setLoading(true);
    setCart(await priceCheckoutAction(m));
    setLoading(false);
  }, []);

  // Merge this browser's cart into the account cart once, then price it.
  useEffect(() => {
    void syncCartNow().then(() => reprice("standard"));
  }, [reprice]);

  // A newly saved address appears via router.refresh(); select it.
  useEffect(() => {
    if (!addresses.some((a) => a.id === addressId)) {
      setAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "");
    }
  }, [addresses, addressId]);

  const chooseMethod = (m: DeliveryMethod): void => {
    setMethod(m);
    void reprice(m);
  };

  const place = (): void => {
    setError(null);
    startPlacing(async () => {
      const r = await placeOrderAction({ addressId, deliveryMethod: method, idempotencyKey });
      if (r.ok) {
        clear();
        router.push(`/account/orders/${r.orderNo}?placed=1`);
        return;
      }
      setError(r.message);
      if (r.code === "CART_CHANGED" || r.code === "OUT_OF_STOCK") await reprice(method);
    });
  };

  const empty = !loading && (!cart || cart.packages.length === 0);
  if (empty) {
    return (
      <div className="grid place-items-center rounded-[22px] border border-line bg-surface px-6 py-14 text-center">
        <p className="text-sm text-text-secondary">Your cart is empty.</p>
        <ButtonLink href="/shop" className="mt-4">
          Continue shopping
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:items-start">
      <div className="flex flex-col gap-5">
        <Step n={1} title="Delivery address">
          {addresses.length > 0 && (
            <div role="radiogroup" aria-label="Delivery address" className="grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-2xl border p-4 text-sm transition-colors",
                    addressId === a.id
                      ? "border-primary-light/60 bg-primary/10"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    value={a.id}
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="block font-semibold">{a.recipientName}</span>
                    <span className="text-text-secondary">
                      {a.line1}
                      {a.line2 && `, ${a.line2}`}, {a.city}, {a.district}
                      <br />
                      {formatPhoneLK(a.phone)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
          {adding ? (
            <div className="mt-4 rounded-2xl border border-line p-4">
              <AddressForm
                submitLabel="Save and use this address"
                onSaved={() => {
                  setAdding(false);
                  router.refresh();
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-primary-light hover:text-text"
            >
              <Plus aria-hidden className="size-4" /> Add a new address
            </button>
          )}
        </Step>

        <Step n={2} title="Delivery method">
          <div role="radiogroup" aria-label="Delivery method" className="grid gap-3 sm:grid-cols-2">
            {methods.map(({ value, label, note, icon: Icon }) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition-colors",
                  method === value
                    ? "border-primary-light/60 bg-primary/10"
                    : "border-line hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name="method"
                  value={value}
                  checked={method === value}
                  onChange={() => chooseMethod(value)}
                  className="mt-0.5 accent-primary"
                />
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary-light" />
                <span className="flex-1">
                  <span className="block font-semibold">{label}</span>
                  <span className="text-text-secondary">{note}</span>
                </span>
                <span className="font-semibold">{formatLKR(fees[value])}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Fee per shop package. Free-delivery items ship free with standard delivery.
          </p>
        </Step>

        <Step n={3} title="Payment">
          <div className="flex items-start gap-3 rounded-2xl border border-primary-light/60 bg-primary/10 p-4 text-sm">
            <Banknote aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
            <span>
              <span className="block font-semibold">Cash on Delivery</span>
              <span className="text-text-secondary">
                Pay the courier in cash when each package arrives. No card needed.
              </span>
            </span>
            <Check aria-hidden className="ml-auto size-5 text-primary-light" />
          </div>
        </Step>
      </div>

      <aside className="rounded-[22px] border border-line bg-surface p-5 lg:sticky lg:top-28">
        <h2 className="font-display text-xl font-bold">Order summary</h2>
        {loading || !cart ? (
          <p className="flex items-center gap-2 py-10 text-sm text-text-secondary">
            <Loader2 aria-hidden className="size-4 animate-spin" /> Checking prices and stock…
          </p>
        ) : (
          <>
            <ul className="mt-4 flex flex-col gap-4">
              {cart.packages.map((p) => (
                <li key={p.seller.slug} className="rounded-2xl border border-line p-3">
                  <p className="mb-2 text-xs font-semibold text-text-secondary">
                    Package from {p.seller.shopName}
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {p.lines.map((l) => (
                      <li key={l.sku} className="flex items-center gap-3 text-sm">
                        <ProductArt
                          product={{ art: l.art, imageUrl: l.imageUrl, name: l.name }}
                          size="sm"
                          artScale={0.4}
                          className="size-12 shrink-0 rounded-xl"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 font-semibold">{l.name}</span>
                          <span className="text-xs text-text-secondary">
                            {l.variantLabel} · Qty {l.qty}
                          </span>
                        </span>
                        <span className="font-semibold">{formatLKR(l.lineTotalCents)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 flex justify-between text-xs text-text-secondary">
                    <span>Delivery</span>
                    <span>{p.deliveryCents ? formatLKR(p.deliveryCents) : "Free"}</span>
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Subtotal</dt>
                <dd>{formatLKR(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Delivery</dt>
                <dd>{cart.deliveryCents ? formatLKR(cart.deliveryCents) : "Free"}</dd>
              </div>
              {cart.savingsCents > 0 && (
                <div className="flex justify-between text-success">
                  <dt>You save</dt>
                  <dd>{formatLKR(cart.savingsCents)}</dd>
                </div>
              )}
              <div className="mt-1 flex justify-between font-display text-lg font-bold">
                <dt>Pay on delivery</dt>
                <dd>{formatLKR(cart.totalCents)}</dd>
              </div>
            </dl>
          </>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger"
          >
            {error}
          </p>
        )}
        {!canOrder && blockedReason && (
          <p className="mt-4 rounded-xl border border-accent/35 bg-accent/10 px-4 py-3 text-[13px]">
            {blockedReason}
          </p>
        )}
        <Button
          type="button"
          size="lg"
          className="mt-4 w-full"
          disabled={!canOrder || !addressId || adding || loading || placing}
          onClick={place}
        >
          {placing ? (
            <>
              <Loader2 aria-hidden className="animate-spin" /> Placing order…
            </>
          ) : (
            <>
              <Lock aria-hidden /> Place order · Cash on Delivery
            </>
          )}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <MapPin aria-hidden className="size-3.5" /> By placing the order you accept the{" "}
          <Link href="/legal/terms" className="underline hover:text-text">
            terms
          </Link>
        </p>
      </aside>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={`step-${n}`}
      className="rounded-[22px] border border-line bg-surface p-5 md:p-6"
    >
      <h2 id={`step-${n}`} className="mb-4 flex items-center gap-3 font-display text-lg font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-on-primary">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
