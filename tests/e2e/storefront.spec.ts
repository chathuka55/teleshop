import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("storefront", () => {
  test("unknown product, category and shop return 404", async ({ request }) => {
    test.setTimeout(120_000); // first hit compiles each route in dev
    for (const path of ["/p/does-not-exist", "/c/does-not-exist", "/s/does-not-exist", "/legal/nope"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("filters are URL state", async ({ page }) => {
    await page.goto("/c/mobile-phones?brand=apple");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mobile Phones");
    const cards = page.getByRole("article");
    await expect(cards).not.toHaveCount(0);
    for (const name of await cards.getByRole("heading").allTextContents())
      expect(name).toMatch(/Apple|iPhone/);
  });

  test("add to cart → cart totals come from the server", async ({ page }) => {
    await page.goto("/p/asus-rog-zephyrus-g16");
    await page.getByRole("button", { name: "Add to cart", exact: true }).click();
    await expect(page.getByRole("button", { name: "Added" })).toBeVisible();

    // Tamper with the stored cart: prices are never read from the client.
    await page.evaluate(() => {
      const items = JSON.parse(localStorage.getItem("teleshop:cart") ?? "[]");
      localStorage.setItem(
        "teleshop:cart",
        JSON.stringify(items.map((i: object) => ({ ...i, priceCents: 1 }))),
      );
    });

    await page.goto("/cart");
    const summary = page.getByRole("complementary", { name: "Order summary" });
    // First /cart hit compiles the page + server action in dev.
    await expect(summary).toContainText("LKR 685,000", { timeout: 30_000 }); // subtotal
    await expect(summary).toContainText("LKR 685,450"); // + one shop delivery

    await page
      .getByRole("button", { name: /Remove/ })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  });

  test("track lookup shows packages and a courier link", async ({ page }) => {
    await page.goto("/track");
    await page.getByRole("textbox", { name: /Order number/ }).fill("TS-2026-000123");
    await page.getByRole("textbox", { name: /Phone number/ }).fill("077 123 4567");
    await page.getByRole("button", { name: "Track order" }).click();
    const link = page.getByRole("link", { name: /Open courier site/ });
    await expect(link).toHaveAttribute("href", /PX-7731%202093%20LK/);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("track lookup gives the same answer for a wrong phone (no enumeration)", async ({ page }) => {
    await page.goto("/track");
    await page.getByRole("textbox", { name: /Order number/ }).fill("TS-2026-000123");
    await page.getByRole("textbox", { name: /Phone number/ }).fill("077 000 0000");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByText("We couldn’t find an order with that number and phone")).toBeVisible();
    // The typed values survive the form reset.
    await expect(page.getByRole("textbox", { name: /Order number/ })).toHaveValue("TS-2026-000123");
  });

  test("sign-in validates on the server and keeps the email", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("textbox", { name: "Email address" }).fill("not-an-email");
    await page.getByRole("button", { name: /^Sign in/ }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email address" })).toHaveValue("not-an-email");
  });

  for (const path of ["/p/apple-iphone-17-pro", "/shop", "/track", "/sign-in", "/register/seller"]) {
    test(`no serious a11y violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
