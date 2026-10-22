import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("renders the hero, sections and security headers", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    const headers = response?.headers() ?? {};
    expect(headers["content-security-policy"]).toContain("'strict-dynamic'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();

    await expect(page.getByRole("heading", { level: 1 })).toContainText("The future of tech");
    await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Featured products" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Featured tech shops" })).toBeVisible();
  });

  test("hero slider controls are keyboard accessible", async ({ page }) => {
    await page.goto("/");
    const slider = page.getByRole("region", { name: "Featured products" });
    await slider.getByRole("button", { name: /Show slide 2 of 3/ }).click();
    await expect(slider.getByRole("button", { name: /Show slide 2 of 3/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await slider.getByRole("button", { name: "Next slide" }).click();
    await expect(slider.getByRole("button", { name: /Show slide 3 of 3/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("featured product tabs filter the grid", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Laptops" }).click();
    const grid = page.getByRole("tab", { name: "Laptops" }).locator("xpath=ancestor::section");
    await expect(grid.getByRole("article")).not.toHaveCount(0);
    await expect(grid.getByText("Mobile Phones", { exact: true })).toHaveCount(0);
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).exclude("canvas").analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
