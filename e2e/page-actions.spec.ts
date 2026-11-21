import { expect, test, type Page } from "@playwright/test";

const EMAIL = "e2e@example.com";
const PASSWORD = "e2e-password-123";

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

test.describe("記事の操作メニュー", () => {
  test("狭い画面では操作がメニューに入り、本文が第一画面に出る", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto("/pages/new");
    await page.locator("#title").fill("第一画面の本文");
    await page.locator("#body").fill("ここが本文の書き出しです。");
    await page.getByRole("button", { name: "保存" }).click();
    await page.waitForURL(/\/pages\/\d+$/);

    const body = page.locator("article .markdown-body");
    await expect(body).toBeVisible();
    const top = await body.evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(450);
    await expect(body).toBeInViewport();

    await expect(page.getByRole("link", { name: "履歴" })).toHaveCount(0);
    await page.getByRole("button", { name: "ページの操作" }).click();
    await expect(page.getByRole("menuitem", { name: "編集" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "履歴" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Markdown" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "ゴミ箱に移動" })).toBeVisible();
  });
});
