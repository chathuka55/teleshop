import { describe, expect, it } from "vitest";
import { DEFAULT_DELIVERY_FEE_CENTS, priceCart } from "@/modules/cart/pricing";
import { cartItemsSchema } from "@/modules/cart/schema";
import { fixtureProducts } from "../../fixtures/products";

const demoProducts = fixtureProducts();

const iphone = "IP17P-256-ORG"; // iStore Colombo, LKR 389,900, 7 in stock, paid delivery
const macbook = "MBA13-M4-16-512"; // iStore Colombo, free delivery
const rog = "ROG-G16-5070-32"; // PC Forge, 5 in stock
const soldOut = "IP17P-512-BLU"; // 0 available

describe("priceCart", () => {
  it("prices lines from the catalogue, never from the client", () => {
    const tampered = [{ sku: iphone, qty: 1, priceCents: 1 }] as unknown as { sku: string; qty: number }[];
    const cart = priceCart(tampered, demoProducts);
    expect(cart.subtotalCents).toBe(38_990_000);
  });

  it("splits lines into one package per seller with one delivery fee each", () => {
    const cart = priceCart(
      [
        { sku: iphone, qty: 1 },
        { sku: rog, qty: 1 },
      ],
      demoProducts,
    );
    expect(cart.packages.map((p) => p.seller.slug).sort()).toEqual(["istore-colombo", "pc-forge"]);
    expect(cart.deliveryCents).toBe(2 * DEFAULT_DELIVERY_FEE_CENTS);
    expect(cart.totalCents).toBe(cart.subtotalCents + cart.deliveryCents);
  });

  it("express delivery charges its fee even for free-delivery items", () => {
    const express = priceCart([{ sku: macbook, qty: 1 }], demoProducts, {
      deliveryFeeCents: 95_000,
      honourFreeDelivery: false,
    });
    expect(express.deliveryCents).toBe(95_000);
  });

  it("ships a package free only when every item in it ships free", () => {
    const onlyFree = priceCart([{ sku: macbook, qty: 1 }], demoProducts);
    expect(onlyFree.deliveryCents).toBe(0);
    const mixed = priceCart(
      [
        { sku: macbook, qty: 1 },
        { sku: iphone, qty: 1 },
      ],
      demoProducts,
    );
    expect(mixed.packages).toHaveLength(1);
    expect(mixed.deliveryCents).toBe(DEFAULT_DELIVERY_FEE_CENTS);
  });

  it("caps quantity at available stock and flags the line", () => {
    const cart = priceCart([{ sku: rog, qty: 9 }], demoProducts);
    const line = cart.packages[0]?.lines[0];
    expect(line?.qty).toBe(5);
    expect(line?.adjusted).toBe(true);
  });

  it("merges duplicate SKUs", () => {
    const cart = priceCart(
      [
        { sku: iphone, qty: 1 },
        { sku: iphone, qty: 2 },
      ],
      demoProducts,
    );
    expect(cart.packages[0]?.lines).toHaveLength(1);
    expect(cart.itemCount).toBe(3);
  });

  it("drops unknown and sold-out SKUs", () => {
    const cart = priceCart(
      [
        { sku: "NOPE-1", qty: 1 },
        { sku: soldOut, qty: 1 },
      ],
      demoProducts,
    );
    expect(cart.itemCount).toBe(0);
    expect(cart.unavailable.sort()).toEqual(["IP17P-512-BLU", "NOPE-1"]);
    expect(cart.totalCents).toBe(0);
  });

  it("reports savings against compare-at prices", () => {
    const cart = priceCart([{ sku: iphone, qty: 2 }], demoProducts);
    expect(cart.savingsCents).toBe(2 * (41_990_000 - 38_990_000));
  });
});

describe("cartItemsSchema", () => {
  it("rejects operator injection, bad SKUs and silly quantities", () => {
    expect(cartItemsSchema.safeParse([{ sku: { $ne: "" }, qty: 1 }]).success).toBe(false);
    expect(cartItemsSchema.safeParse([{ sku: "bad sku", qty: 1 }]).success).toBe(false);
    expect(cartItemsSchema.safeParse([{ sku: iphone, qty: 0 }]).success).toBe(false);
    expect(cartItemsSchema.safeParse([{ sku: iphone, qty: 11 }]).success).toBe(false);
    expect(cartItemsSchema.safeParse([{ sku: iphone, qty: 1.5 }]).success).toBe(false);
  });

  it("limits the cart to 50 lines", () => {
    const many = Array.from({ length: 51 }, (_, i) => ({ sku: `SKU-${i}`, qty: 1 }));
    expect(cartItemsSchema.safeParse(many).success).toBe(false);
  });
});
