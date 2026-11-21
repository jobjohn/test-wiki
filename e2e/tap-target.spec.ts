import { expect, test, type Page } from "@playwright/test";

const EMAIL = "e2e@example.com";
const PASSWORD = "e2e-password-123";

async function login(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  if (await page.locator("#wikiName").isVisible()) {
    await page.locator("#wikiName").fill("E2E テスト Wiki");
    if (await page.locator("#passwordConfirmation").isVisible()) {
      await page.locator("#password").fill(PASSWORD);
      await page.locator("#passwordConfirmation").fill(PASSWORD);
    }
    await page.getByRole("button", { name: "設定を完了して始める" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/setup"));
  }
}

function assertAtLeast44(box: { width: number; height: number } | null) {
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

test.describe("狭い画面のタップ領域", () => {
  test("フォルダの開閉とヘッダーのアイコンは 44px 以上", async ({ page }) => {
    await login(page);
    const menu = page.getByRole("button", { name: "メニュー", exact: true });
    assertAtLeast44(await menu.boundingBox());
    assertAtLeast44(await page.getByRole("button", { name: "ユーザーメニュー" }).boundingBox());
    assertAtLeast44(await page.getByRole("link", { name: "新規ページ" }).boundingBox());

    await menu.click();
    const toggle = page.getByRole("button", { name: /を(開く|閉じる)$/ });
    await expect(toggle).toBeVisible();
    assertAtLeast44(await toggle.boundingBox());
    assertAtLeast44(await page.getByRole("link", { name: "新しいフォルダ" }).boundingBox());
    assertAtLeast44(await page.getByRole("link", { name: "新しいページ" }).boundingBox());
  });
});
