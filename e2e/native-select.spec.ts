import { expect, test, type Page } from "@playwright/test";

const EMAIL = "e2e@example.com";
const PASSWORD = "e2e-password-123";

async function login(page: Page) {
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

async function fontSize(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => getComputedStyle(el).fontSize);
}

test.describe("NativeSelect の文字サイズ", () => {
  test("狭い画面は 16px、デスクトップは 14px（アカウントの select を含む）", async ({ page }) => {
    await login(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/account");
    const selects = page.locator("select");
    await expect(selects).toHaveCount(2);
    expect(await fontSize(page, "#token-scope")).toBe("16px");
    expect(await fontSize(page, "#token-expiry")).toBe("16px");

    await page.goto("/pages/new");
    expect(await fontSize(page, "#folderId")).toBe("16px");

    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await fontSize(page, "#folderId")).toBe("14px");
    await page.goto("/account");
    expect(await fontSize(page, "#token-scope")).toBe("14px");
    expect(await fontSize(page, "#token-expiry")).toBe("14px");
  });
});
