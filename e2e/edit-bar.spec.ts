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

test.describe("編集画面の保存バー", () => {
  test("狭い画面では保存が画面内に残り、本文欄がスクロールする", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto("/pages/new");
    await page.locator("#body").waitFor();

    const long = `${"長い本文の行です。\n".repeat(80)}末尾`;
    await page.locator("#body").fill(long);

    const save = page.getByRole("button", { name: "保存" });
    const cancel = page.getByRole("link", { name: "キャンセル" });
    await expect(save).toBeInViewport();
    await expect(cancel).toBeInViewport();

    const metrics = await page.evaluate(() => {
      const textarea = document.querySelector("#body") as HTMLTextAreaElement;
      const bar = document.querySelector("[data-testid=save-bar]") as HTMLElement;
      const barBox = bar.getBoundingClientRect();
      const textBox = textarea.getBoundingClientRect();
      return {
        scrollHeight: textarea.scrollHeight,
        clientHeight: textarea.clientHeight,
        fieldSizing: getComputedStyle(textarea).getPropertyValue("field-sizing"),
        barBottom: barBox.bottom,
        barTop: barBox.top,
        textBottom: textBox.bottom,
        paddingBottom: getComputedStyle(bar).paddingBottom,
        pageScroll: document.documentElement.scrollHeight,
      };
    });

    expect(metrics.fieldSizing).toBe("fixed");
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    expect(metrics.textBottom).toBeLessThanOrEqual(metrics.barTop + 1);
    expect(metrics.barBottom).toBeLessThanOrEqual(844);
    // safe-area-inset-bottom を下端の余白に使っている（実機以外では 0 になり、0.75rem が残る）
    expect(metrics.paddingBottom).toBe("12px");
    expect(metrics.pageScroll).toBeLessThanOrEqual(844 + 2);
  });
});
