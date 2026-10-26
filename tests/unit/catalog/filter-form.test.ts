// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { filtersToSearch } from "@/components/product/FilterForm";
import { parseProductQuery } from "@/modules/catalog/schema";

function form(html: string): HTMLFormElement {
  const f = document.createElement("form");
  f.innerHTML = html;
  return f;
}

describe("filtersToSearch (instant filters)", () => {
  it("drops empty fields and joins repeated checkboxes", () => {
    const f = form(`
      <input name="min" value="" />
      <input name="max" value="389900" />
      <input type="checkbox" name="brand" value="apple" checked />
      <input type="checkbox" name="brand" value="samsung" checked />
      <input type="checkbox" name="brand" value="sony" />
      <input type="checkbox" name="spec.storage" value="256GB" checked />
      <input type="checkbox" name="spec.storage" value="512GB" checked />
      <input type="checkbox" name="inStock" value="1" checked />
    `);
    expect(filtersToSearch(f)).toBe("max=389900&brand=apple%2Csamsung&spec.storage=256GB%2C512GB&inStock=1");
  });

  it("produces URLs the server parser reads back identically", () => {
    const f = form(`
      <input name="min" value="100000" />
      <input type="checkbox" name="condition" value="new" checked />
      <input type="checkbox" name="condition" value="refurbished" checked />
    `);
    const params = Object.fromEntries(new URLSearchParams(filtersToSearch(f)));
    const q = parseProductQuery(params);
    expect(q.minPriceCents).toBe(10_000_000);
    expect(q.condition).toEqual(["new", "refurbished"]);
  });

  it("returns an empty string when nothing is selected", () => {
    expect(
      filtersToSearch(form(`<input name="min" value="" /><input type="checkbox" name="brand" value="x" />`)),
    ).toBe("");
  });
});
