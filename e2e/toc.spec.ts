import { expect, test, type Page } from "@playwright/test";

const EMAIL = "e2e@example.com";
const PASSWORD = "e2e-password-123";
const BODY = ["# 概要", "導入です。", "## 手順", "手順です。", "### 確認", "確認です。"].join("\n\n");

async function login(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  // ログイン直後は / を経由して /setup へ移る。途中の URL で判定すると初期設定を飛ばす
  if (!page.url().includes("/setup")) {
    await page.waitForURL(/\/setup/, { timeout: 3000 }).catch(() => {});
  }
  if (page.url().includes("/setup")) {
    await page.locator("#wikiName").fill("E2E テスト Wiki");
    if (await page.locator("#passwordConfirmation").isVisible()) {
      await page.locator("#password").fill(PASSWORD);
      await page.locator("#passwordConfirmation").fill(PASSWORD);
    }
    await page.getByRole("button", { name: "設定を完了して始める" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/setup"));
  }
}

test.describe("目次", () => {
  test("サーバーの HTML に含まれ、狭い画面では閉じて、デスクトップでは sticky", async ({ page }) => {
    await login(page);
    await page.goto("/pages/new");
    await page.locator("#title").fill("目次のあるページ");
    await page.locator("#body").fill(BODY);
    await page.getByRole("button", { name: "保存" }).click();
    await page.waitForURL(/\/pages\/\d+$/);
    const url = page.url();

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(url);
    const html = await response?.text();
    expect(html).toContain('aria-label="目次"');
    expect(html).toContain(">手順<");
    const details = page.locator("article details");
    await expect(details).toBeVisible();
    await expect(details).not.toHaveAttribute("open");
    await expect(details.getByRole("link", { name: "手順" })).toBeHidden();
    await details.locator("summary").click();
    await expect(details.getByRole("link", { name: "手順" })).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    const nav = page.getByRole("navigation", { name: "目次" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "手順" })).toBeVisible();
    expect(await nav.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
    await expect(page.locator("article .markdown-body")).toBeVisible();
  });
});
