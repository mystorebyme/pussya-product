/**
 * Playwright suite (browser) — smoke.mjs ke baad chalta hai.
 * Install: npx playwright install --with-deps chromium
 * Run:     npm run test:e2e
 */
import { expect, test } from "@playwright/test";

const PRODUCT_HANDLE = "green-bandhej-maslin-anarkali-suit-set-td-141-copy";

test("home → collection → product", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
  await page.getByRole("link", { name: /lehenga/i }).first().click();
  await expect(page).toHaveURL(/collections\//);
  const card = page.getByTestId("product-card").first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/products\//);
  await expect(page.getByTestId("add-to-cart")).toBeVisible();
});

test("size select → add to bag → cart count", async ({ page }) => {
  await page.goto(`/products/${PRODUCT_HANDLE}`);
  await page.getByTestId("size-option").nth(1).click();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-drawer")).toBeVisible();
  await expect(page.getByTestId("cart-count")).toHaveText(/[1-9]/);
});

test("COD checkout under the limit creates an order", async ({ page }) => {
  await page.goto(`/products/${PRODUCT_HANDLE}`);
  await page.getByTestId("add-to-cart").click();
  await page.getByRole("link", { name: /checkout/i }).first().click();
  await page.getByLabel(/name/i).fill("Playwright Buyer");
  await page.getByLabel(/email/i).fill("pw@example.com");
  await page.getByLabel(/phone/i).fill("9876543210");
  await page.getByLabel(/address/i).fill("12 MI Road, Panch Batti");
  await page.getByLabel(/city/i).fill("Jaipur");
  await page.getByLabel(/state/i).fill("Rajasthan");
  await page.getByLabel(/pincode/i).fill("302001");
  await page.getByTestId("checkout-submit").click();
  await expect(page.getByTestId("order-number")).toHaveText(/NE-[A-Z0-9]{6,12}/);
});

test("search overlay finds anarkali styles", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("header-search").click();
  await page.getByTestId("search-input").fill("anarkali");
  await expect(page.getByTestId("product-card").first()).toBeVisible({ timeout: 5_000 });
});

test("mobile nav opens and closes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: /menu/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("unknown order number shows a friendly error", async ({ page }) => {
  await page.goto("/orders/NE-NOTREAL1");
  await expect(page.getByText(/not found|nahi mila|track/i).first()).toBeVisible();
});
