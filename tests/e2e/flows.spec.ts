import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, accounts, adminSignIn, signIn } from "./support/session";

/*
 * docs/11 flows, one order end to end: customer orders a phone (COD) → the shop accepts,
 * records the IMEI and marks it ready → an admin (TOTP) adds the courier code → the customer
 * sees the tracking link. Axe runs on every signed-in page the flow passes through.
 * Needs a seeded database with a known password (see support/session.ts).
 */
test.describe.configure({ mode: "serial" });
test.skip(!E2E_PASSWORD, "set E2E_PASSWORD (and seed with SEED_PASSWORD) to run the flows");
test.skip(({ isMobile }) => isMobile, "one run is enough: the flows change the database");

const PRODUCT = "/p/apple-iphone-17-pro"; // iStore Colombo, needs an IMEI
let orderNo = "";
// Domex format ^DX\d{9}$, unique per run (codes are unique per courier).
const trackingCode = `DX${String(Date.now()).slice(-9)}`;

async function expectNoSeriousA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).exclude("canvas").analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test("customer: product → cart → checkout (COD) → My Orders", async ({ page }) => {
  await signIn(page, accounts.customer);
  await page.goto(PRODUCT);
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(page.getByRole("button", { name: "Added" })).toBeVisible();

  await page.goto("/checkout");
  const placeOrder = page.getByRole("button", { name: /Place order/ });
  await expect(placeOrder).toBeVisible();
  if (await page.getByLabel("Recipient name").isVisible()) {
    await page.getByLabel("Recipient name").fill("Nimal Perera");
    await page.getByLabel("Mobile number").fill("0771234567");
    await page.getByLabel("House number and street").fill("12 Temple Road");
    await page.getByLabel("City").fill("Kandy");
    await page.getByLabel("District").selectOption("Kandy");
    await page.getByRole("button", { name: "Save and use this address" }).click();
  }
  await expect(placeOrder).toBeEnabled({ timeout: 20_000 });
  await expectNoSeriousA11y(page);
  await placeOrder.click();

  await expect(page).toHaveURL(/\/account\/orders\/TS-\d{4}-\d{6}\?placed=1/);
  orderNo = /TS-\d{4}-\d{6}/.exec(page.url())?.[0] ?? "";
  await expect(page.getByRole("heading", { name: orderNo })).toBeVisible();
  await expectNoSeriousA11y(page);

  await page.goto("/account/orders");
  await expect(page.getByText(orderNo)).toBeVisible();
});

test("seller: accept → IMEI → packing → ready to ship", async ({ page }) => {
  expect(orderNo).not.toBe("");
  await signIn(page, accounts.seller);
  await page.goto(`/seller/orders/${orderNo}`);
  await expectNoSeriousA11y(page);

  await page.getByRole("button", { name: "Accept order" }).click();
  await expect(page.getByRole("button", { name: "Start packing" })).toBeVisible();
  await page.getByLabel("Unit 1 IMEI or serial").fill("356938035643809");
  await page.getByRole("button", { name: "Save numbers" }).click();
  await expect(page.getByText(/saved/i).first()).toBeVisible();
  await page.getByRole("button", { name: "Start packing" }).click();
  await page.getByRole("button", { name: "Mark ready to ship" }).click();
  await expect(page.getByText("Waiting for courier hand-over")).toBeVisible();
});

test("admin (TOTP): add the courier code → shipped", async ({ page }) => {
  await adminSignIn(page);
  await expectNoSeriousA11y(page);
  await page.goto(`/admin/orders/${orderNo}`);
  await page.getByLabel("Courier").selectOption({ label: "Domex" });
  await page.getByLabel("Tracking code").fill(trackingCode);
  await page.getByRole("button", { name: "Save & mark as Shipped" }).click();
  // The code also shows in the live link preview, so wait for the saved result itself.
  await expect(page.getByText(/^Shipped with Domex\./)).toBeVisible();
  await expect(page.getByRole("link", { name: /Track on courier website/ })).toHaveAttribute(
    "href",
    new RegExp(trackingCode),
  );
  await expectNoSeriousA11y(page);
});

test("customer sees the tracking link", async ({ page }) => {
  await signIn(page, accounts.customer);
  await page.goto(`/account/orders/${orderNo}`);
  const link = page.getByRole("link", { name: /Track on courier website/ });
  await expect(link).toHaveAttribute("href", new RegExp(trackingCode));
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});
