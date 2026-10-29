import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { generate } from "otplib";

/**
 * Sign-in helpers for the end-to-end flows. They need a database seeded with one known password:
 *   SEED_PASSWORD=<pw> pnpm db:seed --force   then   E2E_PASSWORD=<pw> pnpm test:e2e
 * Without E2E_PASSWORD the flows are skipped (e.g. on a preview whose passwords we don't know).
 */
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";

export const accounts = {
  customer: "customer@teleshop.local",
  seller: "seller@teleshop.local", // iStore Colombo
  admin: "admin@teleshop.local",
} as const;

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.locator('input[name="password"]').fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page).not.toHaveURL(/\/sign-in/);
}

/**
 * The admin's TOTP secret: set up on the first run after a seed, then reused from this file
 * (not under test-results/, which Playwright empties before every run; never committed).
 */
const TOTP_FILE = path.join("node_modules", ".cache", "teleshop-e2e", "admin-totp");

const totpCode = (secret: string): Promise<string> => generate({ secret });

/** Admin password + TOTP. Sets up two-step verification when the account doesn't have it yet. */
export async function adminSignIn(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByRole("textbox", { name: "Email address" }).fill(accounts.admin);
  await page.locator('input[name="password"]').fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /^Sign in/ }).click();

  const enrol = page.getByText("Set up two-step verification");
  const verify = page.getByLabel("6-digit code or recovery code");
  await expect(enrol.or(verify)).toBeVisible();

  if (await enrol.isVisible()) {
    const secret = (await page.locator("code").first().innerText()).replace(/\s+/g, "");
    fs.mkdirSync(path.dirname(TOTP_FILE), { recursive: true });
    fs.writeFileSync(TOTP_FILE, secret);
    await page.getByLabel("Code from the app").fill(await totpCode(secret));
    await page.getByRole("button", { name: /Turn on two-step verification/ }).click();
    await expect(page.getByText(/recovery codes/i).first()).toBeVisible();
    await page.locator('form button[type="submit"]').last().click();
  } else {
    const secret =
      process.env.E2E_ADMIN_TOTP ?? (fs.existsSync(TOTP_FILE) ? fs.readFileSync(TOTP_FILE, "utf8") : "");
    if (!secret) throw new Error("Admin already has 2FA: re-seed, or set E2E_ADMIN_TOTP to its secret.");
    await verify.fill(await totpCode(secret.trim()));
    await page.getByRole("button", { name: /^Verify/ }).click();
  }
  await expect(page).toHaveURL(/\/admin$/);
}
