import { describe, expect, it } from "vitest";
import { isNavActive, mainNav } from "@/config/site";

/** Labels of the main-nav links that are active on `pathname`. */
const activeOn = (pathname: string): string[] =>
  mainNav.filter((l) => isNavActive(l, pathname)).map((l) => l.label);

describe("isNavActive", () => {
  it("highlights exactly one item on each storefront page", () => {
    expect(activeOn("/")).toEqual(["Home"]);
    expect(activeOn("/shop")).toEqual(["Shop"]);
    expect(activeOn("/deals")).toEqual(["Deals"]);
    expect(activeOn("/c/mobile-phones")).toEqual(["Categories"]);
    expect(activeOn("/p/apple-iphone-17-pro")).toEqual(["Shop"]);
    expect(activeOn("/sellers")).toEqual(["Sellers"]);
    expect(activeOn("/s/techzone")).toEqual(["Sellers"]);
    expect(activeOn("/about")).toEqual(["About"]);
  });

  it("does not light up Shop and Deals together", () => {
    expect(activeOn("/deals")).not.toContain("Shop");
    expect(activeOn("/shop")).not.toContain("Deals");
  });

  it("matches whole path segments only", () => {
    expect(activeOn("/shopping")).toEqual([]);
    expect(activeOn("/about-us")).toEqual([]);
    expect(activeOn("/track")).toEqual([]);
  });
});
