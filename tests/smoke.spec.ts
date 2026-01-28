import { test, expect, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? "test@grannfrid.se";
const password = process.env.E2E_PASSWORD ?? "Test1234!";

async function ensureLoggedIn(page: Page) {
  await page.goto("/login");

  const emailInput = page.locator("#email");
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Logga in" }).click();
  }

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("smoke: kundvy, filer, billing och pagination", async ({ page }) => {
  await ensureLoggedIn(page);

  await page.goto("/customers");
  await expect(page.getByText("Kunder")).toBeVisible();
  await expect(page.getByText(/Sida \d+ av \d+/)).toBeVisible();

  const firstCustomerRow = page.locator("table tbody tr").first();
  await expect(firstCustomerRow).toBeVisible();
  await firstCustomerRow.click();

  await page.getByRole("tab", { name: "Senaste aktivitet" }).click();
  await expect(page.getByText("Senaste aktivitet")).toBeVisible();

  await page.getByRole("tab", { name: "Filer" }).click();
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles("tests/fixtures/sample-upload.txt");
  await expect(page.getByText("sample-upload.txt")).toBeVisible({
    timeout: 20000,
  });

  await page.goto("/billing");
  await expect(
    page.getByRole("heading", { name: "Fakturering" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Fakturaunderlag" }).click();

  const batchMenuButtons = page.locator("table tbody tr").locator("button");
  if ((await batchMenuButtons.count()) > 0) {
    await batchMenuButtons.first().click();
    const viewDetail = page.getByRole("menuitem", { name: "Visa underlag" });
    if ((await viewDetail.count()) > 0) {
      await viewDetail.click();
      await expect(page.getByText("Fakturaunderlag")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Exportera CSV" }),
      ).toBeVisible();
    }
  }
});
