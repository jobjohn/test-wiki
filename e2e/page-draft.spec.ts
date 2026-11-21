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

test.describe("編集のローカル下書き", () => {
  test("離脱して戻ると下書きを復元でき、保存すると消える", async ({ page }) => {
    await login(page);
    await page.goto("/pages/new");
    await page.locator("#title").fill("下書きのページ");
    await page.locator("#body").fill("下書きの本文");
    await page.locator("#summary").fill("下書きの要約");
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));

    const stored = await page.evaluate(() => localStorage.getItem("test-wiki:page-draft:new"));
    expect(stored).toContain("下書きの本文");
    expect(stored).toContain("下書きの要約");

    await page.goto("/");
    await page.goto("/pages/new");
    await expect(page.getByRole("button", { name: "下書きを復元" })).toBeVisible();
    await page.getByRole("button", { name: "下書きを復元" }).click();
    await expect(page.locator("#title")).toHaveValue("下書きのページ");
    await expect(page.locator("#body")).toHaveValue("下書きの本文");
    await expect(page.locator("#summary")).toHaveValue("下書きの要約");

    await page.getByRole("button", { name: "保存" }).click();
    await page.waitForURL(/\/pages\/\d+$/);
    const id = new URL(page.url()).pathname.split("/").pop();
    const left = await page.evaluate(
      (pageId) => ({
        created: localStorage.getItem("test-wiki:page-draft:new"),
        saved: localStorage.getItem(`test-wiki:page-draft:${pageId}`),
      }),
      id,
    );
    expect(left.created).toBeNull();
    expect(left.saved).toBeNull();
  });

  test("要約だけの変更でも離脱確認が出て、非表示になったときも下書きが残る", async ({ page }) => {
    await login(page);
    await page.goto("/pages/new");
    await page.locator("#title").fill("要約だけのページ");
    await page.locator("#body").fill("本文は保存する");
    await page.getByRole("button", { name: "保存" }).click();
    await page.waitForURL(/\/pages\/\d+$/);
    const id = new URL(page.url()).pathname.split("/").pop() ?? "";

    await page.goto(`/pages/${id}/edit`);
    await page.locator("#summary").fill("要約だけ変えた");
    let confirmed = false;
    page.once("dialog", async (dialog) => {
      confirmed = true;
      expect(dialog.message()).toContain("保存していない変更");
      await dialog.dismiss();
    });
    await page.getByRole("link", { name: "キャンセル" }).click();
    expect(confirmed).toBe(true);
    await expect(page).toHaveURL(new RegExp(`/pages/${id}/edit$`));

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const raw = await page.evaluate((pageId) => localStorage.getItem(`test-wiki:page-draft:${pageId}`), id);
    expect(raw).toContain("要約だけ変えた");
  });
});
