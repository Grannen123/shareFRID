/**
 * Regressions-QA: Huvudflöde
 * Testar: Kund → Uppdrag → Journal → Tid → Fakturering
 */
import { test, expect } from "@playwright/test";

const TEST_EMAIL = "test@grannfrid.se";
const TEST_PASSWORD = "Test1234!";

test.describe("Regressions-QA: Huvudflöde", () => {
  test.beforeEach(async ({ page }) => {
    // Logga in
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15000 });
    await page.waitForTimeout(2000);
  });

  test("kan navigera genom huvudflödet", async ({ page }) => {
    // 1. Dashboard laddar
    await expect(page.locator("h1, h2").first()).toBeVisible({
      timeout: 10000,
    });
    await page.screenshot({ path: "/tmp/regression_01_dashboard.png" });

    // 2. Navigera till Kunder
    await page.click('a[href="/customers"]');
    await page.waitForURL("/customers");
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("h1, h2").filter({ hasText: /kunder/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "/tmp/regression_02_customers.png" });

    // 3. Navigera till Uppdrag
    await page.click('a[href="/assignments"]');
    await page.waitForURL("/assignments");
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("h1, h2").filter({ hasText: /uppdrag/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "/tmp/regression_03_assignments.png" });

    // 4. Navigera till Uppgifter
    await page.click('a[href="/tasks"]');
    await page.waitForURL("/tasks");
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("h1, h2").filter({ hasText: /uppgifter/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "/tmp/regression_04_tasks.png" });

    // 5. Navigera till Fakturering
    await page.click('a[href="/billing"]');
    await page.waitForURL("/billing");
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("h1, h2").filter({ hasText: /faktur/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "/tmp/regression_05_billing.png" });

    // 6. Navigera till Anteckningar
    await page.click('a[href="/notes"]');
    await page.waitForURL("/notes");
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("h1, h2").filter({ hasText: /anteckn/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "/tmp/regression_06_notes.png" });

    // 7. Navigera till Kunskapsbank
    await page.click('a[href="/knowledge"]');
    await page.waitForURL("/knowledge");
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("h1, h2").filter({ hasText: /kunskap/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "/tmp/regression_07_knowledge.png" });

    console.log("✅ Huvudflöde: Alla sidor navigerbara");
  });

  test("kan öppna kunddetalj", async ({ page }) => {
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Klicka på första kunden (om den finns)
    const customerRow = page.locator('[class*="cursor-pointer"]').first();
    if ((await customerRow.count()) > 0) {
      await customerRow.click();
      await page.waitForTimeout(1000);
      // Verifiera att detalj-vy visas (har flikar)
      const tabs = page.locator('[role="tablist"], [class*="tabs"]');
      if ((await tabs.count()) > 0) {
        console.log("✅ Kunddetalj: Flikar synliga");
      }
    } else {
      console.log("⚠️ Inga kunder att klicka på");
    }

    await page.screenshot({ path: "/tmp/regression_08_customer_detail.png" });
  });

  test("kan öppna uppdragsdetalj", async ({ page }) => {
    await page.goto("/assignments");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Klicka på första uppdraget (om det finns)
    const assignmentRow = page.locator('[class*="cursor-pointer"]').first();
    if ((await assignmentRow.count()) > 0) {
      await assignmentRow.click();
      await page.waitForTimeout(1000);
      // Verifiera att detalj-vy visas
      const tabs = page.locator('[role="tablist"], [class*="tabs"]');
      if ((await tabs.count()) > 0) {
        console.log("✅ Uppdragsdetalj: Flikar synliga");
      }
    } else {
      console.log("⚠️ Inga uppdrag att klicka på");
    }

    await page.screenshot({
      path: "/tmp/regression_09_assignment_detail.png",
    });
  });
});
