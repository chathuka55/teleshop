import { describe, expect, it } from "vitest";
import { mergeCarts } from "@/modules/cart/merge";
import { MAX_CART_LINES, MAX_QTY } from "@/modules/cart/schema";

describe("mergeCarts (browser cart → account cart)", () => {
  it("keeps one line per SKU with the larger quantity, saved lines first", () => {
    expect(
      mergeCarts(
        [
          { sku: "A-1", qty: 2 },
          { sku: "B-1", qty: 1 },
        ],
        [
          { sku: "B-1", qty: 3 },
          { sku: "C-1", qty: 1 },
        ],
      ),
    ).toEqual([
      { sku: "A-1", qty: 2 },
      { sku: "B-1", qty: 3 },
      { sku: "C-1", qty: 1 },
    ]);
  });

  it("caps quantity and number of lines", () => {
    expect(mergeCarts([{ sku: "A-1", qty: 9 }], [{ sku: "A-1", qty: 50 }])).toEqual([
      { sku: "A-1", qty: MAX_QTY },
    ]);
    const many = Array.from({ length: 80 }, (_, i) => ({ sku: `S-${i}`, qty: 1 }));
    expect(mergeCarts(many, [])).toHaveLength(MAX_CART_LINES);
  });
});
