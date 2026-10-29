import { expect, test } from "@playwright/test";

/* Phone-only regressions (the "mobile" project, Pixel 7). */
test.describe("mobile layout", () => {
  test.skip(({ isMobile }) => !isMobile, "phone viewport only");

  test("the menu drawer covers the whole screen and navigates", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    // The navbar's backdrop-filter once trapped the fixed drawer inside the 62px bar.
    const box = await drawer.boundingBox();
    const viewport = page.viewportSize();
    expect(box?.height).toBe(viewport?.height);
    expect(box?.width).toBe(viewport?.width);

    await drawer.getByRole("link", { name: /Shop all products/ }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(drawer).toBeHidden();
  });

  test("the loading screen never sticks: gone within 4 s, also after Back", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".splash")).toHaveCount(0, { timeout: 4_000 });
    await page.goto("/shop");
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(".splash")).toHaveCount(0, { timeout: 4_000 });
  });
});
