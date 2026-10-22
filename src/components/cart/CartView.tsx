"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ArrowRight, Banknote, BadgeCheck, Lock, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { priceCartAction } from "@/modules/cart/actions";
import type { PricedCartDTO } from "@/modules/cart/types";
import { formatLKR } from "@/lib/utils/money";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ProductArt } from "@/components/product/ProductArt";

/**
 * Figma "04 · Shopping Cart" (10:443) / "M4" (24:3204). The browser only knows SKUs + quantities;
 * every price on this page comes back from `priceCartAction` (server).
 */
export function CartView() {
  const { items, setQty, remove } = useCart();
  const [cart, setCart] = useState<PricedCartDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const key = JSON.stringify(items);

  useEffect(() => {
    startTransition(async () => {
      const res = await priceCartAction(JSON.parse(key));
      if (res.ok) {
        setCart(res.cart);
        setError(null);
      } else {
        setError(
          res.code === "RATE_LIMITED"
            ? "Too many updates — please wait a moment."
            : "Your cart could not be read.",
        );
      }
    });
  }, [key]);

  if (!cart && (pending || items.length > 0)) {
    return (
      <div
        className="h-64 animate-pulse rounded-[22px] bg-surface"
        aria-busy="true"
        aria-label="Loading cart"
      />
    );
  }

  if (!cart || cart.itemCount === 0) {
    return (
      <div className="flex flex-col items-center rounded-[22px] border border-line bg-surface px-6 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary/12 text-primary-light">
          <ShoppingCart aria-hidden className="size-7" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold">Your cart is empty</h2>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          Browse phones, laptops and accessories from verified shops — pay cash when it arrives.
        </p>
        <ButtonLink href="/shop" className="mt-6">
          Start shopping <ArrowRight aria-hidden />
        </ButtonLink>
        {cart && cart.unavailable.length > 0 && (
          <p className="mt-4 text-xs text-text-muted">
            Some items were removed because they are no longer available.
          </p>
        )}
      </div>
    );
  }

  const shops = cart.packages.length;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        <p className="-mt-2 text-sm text-text-secondary lg:hidden">
          {cart.itemCount} items · {shops} {shops === 1 ? "shop" : "shops"}
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {error}
          </p>
        )}
        {cart.unavailable.length > 0 && (
          <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
            {cart.unavailable.length} item(s) are out of stock and were not counted.{" "}
            <button type="button" className="underline" onClick={() => cart.unavailable.forEach(remove)}>
              Remove them
            </button>
          </p>
        )}

        {cart.packages.map((pkg) => (
          <section
            key={pkg.seller.slug}
            aria-label={`Items from ${pkg.seller.shopName}`}
            className="overflow-hidden rounded-[22px] border border-line bg-surface"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Link href={`/s/${pkg.seller.slug}`} className="font-semibold hover:text-primary-light">
                  {pkg.seller.shopName}
                </Link>
                <BadgeCheck aria-label="Verified seller" className="size-4 text-primary-light" />
                <Badge size="sm">Ships in 1–2 days</Badge>
              </div>
              <span className="text-[13px] text-text-secondary">
                Delivery:{" "}
                {pkg.deliveryCents ? (
                  formatLKR(pkg.deliveryCents)
                ) : (
                  <span className="text-success">Free</span>
                )}
              </span>
            </header>
            <ul className="divide-y divide-line">
              {pkg.lines.map((line) => (
                <li
                  key={line.sku}
                  className="grid grid-cols-[72px_1fr] gap-4 px-5 py-4 sm:grid-cols-[72px_1fr_auto_auto] sm:items-center"
                >
                  <Link href={`/p/${line.productSlug}`} aria-hidden tabIndex={-1}>
                    <ProductArt product={line} artScale={0.42} className="size-[72px]" />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/p/${line.productSlug}`}
                      className="line-clamp-2 font-semibold hover:text-primary-light"
                    >
                      {line.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-text-secondary">{line.variantLabel}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {line.available <= 3 ? (
                        <Badge tone="accent" size="sm" dot>
                          Only {line.available} left
                        </Badge>
                      ) : (
                        <Badge tone="success" size="sm" dot>
                          In stock
                        </Badge>
                      )}
                      <Badge tone="primary" size="sm">
                        COD
                      </Badge>
                      <button
                        type="button"
                        onClick={() => remove(line.sku)}
                        className="ml-1 inline-flex min-h-8 items-center gap-1 text-xs text-danger hover:underline"
                      >
                        <Trash2 aria-hidden className="size-3.5" /> Remove
                      </button>
                    </div>
                    {line.adjusted && (
                      <p className="mt-1 text-xs text-accent">
                        Quantity lowered to what the shop has in stock.
                      </p>
                    )}
                  </div>
                  <div className="col-start-2 flex h-11 w-fit items-center rounded-xl border border-line bg-white/4 sm:col-start-auto">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${line.name}`}
                      disabled={line.qty <= 1}
                      onClick={() => setQty(line.sku, line.qty - 1)}
                      className="grid h-full w-10 place-items-center disabled:opacity-40"
                    >
                      <Minus aria-hidden className="size-4" />
                    </button>
                    <output className="w-7 text-center text-sm font-semibold">{line.qty}</output>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${line.name}`}
                      disabled={line.qty >= Math.min(10, line.available)}
                      onClick={() => setQty(line.sku, line.qty + 1)}
                      className="grid h-full w-10 place-items-center disabled:opacity-40"
                    >
                      <Plus aria-hidden className="size-4" />
                    </button>
                  </div>
                  <div className="col-start-2 text-left sm:col-start-auto sm:min-w-[120px] sm:text-right">
                    <p className="font-display text-lg font-bold">{formatLKR(line.lineTotalCents)}</p>
                    {line.compareAtCents && line.compareAtCents > line.unitPriceCents && (
                      <p className="text-xs text-text-muted line-through">
                        {formatLKR(line.compareAtCents * line.qty)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <aside
        aria-label="Order summary"
        className="rounded-[22px] border border-line bg-surface p-6 lg:sticky lg:top-28"
      >
        <h2 className="font-display text-xl font-bold">Order summary</h2>
        <dl className="mt-4 flex flex-col gap-3 text-sm" aria-busy={pending}>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Subtotal ({cart.itemCount} items)</dt>
            <dd className="font-semibold">{formatLKR(cart.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">
              Delivery · {shops} {shops === 1 ? "shop" : "shops"}
            </dt>
            <dd className="font-semibold">{cart.deliveryCents ? formatLKR(cart.deliveryCents) : "Free"}</dd>
          </div>
          {cart.savingsCents > 0 && (
            <div className="flex justify-between">
              <dt className="text-text-secondary">You save</dt>
              <dd className="font-semibold text-success">{formatLKR(cart.savingsCents)}</dd>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-line pt-4 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-display text-xl font-bold">{formatLKR(cart.totalCents)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex items-start gap-3 rounded-[14px] border border-primary/25 bg-primary/8 p-3.5">
          <Banknote aria-hidden className="mt-0.5 size-5 shrink-0 text-primary-light" />
          <p className="text-xs text-text-secondary">
            <span className="block text-[13px] font-semibold text-text">Pay with Cash on Delivery</span>
            Pay the courier when each package arrives.
          </p>
        </div>
        <ButtonLink href="/checkout" size="lg" className="mt-4 w-full">
          Proceed to checkout <ArrowRight aria-hidden />
        </ButtonLink>
        <ButtonLink href="/shop" variant="glass" size="lg" className="mt-2.5 w-full">
          Continue shopping
        </ButtonLink>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <Lock aria-hidden className="size-3.5" /> Secure checkout · Verified sellers only
        </p>
      </aside>
    </div>
  );
}
