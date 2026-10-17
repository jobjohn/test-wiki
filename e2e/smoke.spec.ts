import { expect, test, type Page } from "@playwright/test";

const EMAIL = "e2e@example.com";
const PASSWORD = "e2e-password-123";
const WIKI_NAME = "E2E テスト Wiki";
const TITLE = "E2E スモークページ";
const KEYWORD = "スモークテスト用のキーワードxyz";

// 順番に依存するテストなので、ページの ID は後続のテストへ持ち越す
let pageId = "";
// ログイン状態を引き継ぐため、テスト間で同じブラウザのタブを使い回す
let page: Page;

async function expectLoginPage(page: Page) {
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("#email")).toBeVisible();
}

test.describe.serial("スモークテスト", () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });
  test.afterAll(async () => {
    await page.close();
  });

  test("ログインして初期設定を済ませ、ホームが開く", async () => {
    await page.goto("/");
    await expectLoginPage(page);

    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: "ログイン", exact: true }).click();

    // ログイン後は初期設定の画面になる
    await expect(page.locator("#wikiName")).toBeVisible();
    await page.locator("#wikiName").fill(WIKI_NAME);
    // 初期パスワードの変更欄が出る場合は埋める
    if (await page.locator("#passwordConfirmation").isVisible()) {
      await page.locator("#password").fill(PASSWORD);
      await page.locator("#passwordConfirmation").fill(PASSWORD);
    }
    await page.getByRole("button", { name: "設定を完了して始める" }).click();

    await expect(page.getByRole("heading", { level: 1, name: WIKI_NAME })).toBeVisible();
  });

  test("ページを作成し、検索し、編集して履歴に 2 版が残る", async () => {
    await page.goto("/pages/new");
    await page.locator("#title").fill(TITLE);
    await page.locator("#tags").fill("e2e");
    await page.locator("#body").fill(`これは ${KEYWORD} を含む本文です。`);
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page).toHaveURL(/\/pages\/\d+$/);
    pageId = new URL(page.url()).pathname.split("/").pop() ?? "";
    await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
    await expect(page.getByText(KEYWORD)).toBeVisible();

    // タイトルと一致しないキーワードで検索する（完全一致だと直接ページへ移動するため）
    await page.goto(`/search?q=${encodeURIComponent(KEYWORD)}`);
    await expect(page.getByRole("main").getByRole("link", { name: TITLE })).toBeVisible();

    await page.goto(`/pages/${pageId}/edit`);
    await page.locator("#body").fill(`編集後の本文です。${KEYWORD}`);
    await page.locator("#summary").fill("E2E で編集");
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page).toHaveURL(new RegExp(`/pages/${pageId}$`));
    await expect(page.getByText("編集後の本文です。")).toBeVisible();

    await page.goto(`/pages/${pageId}/revisions`);
    await expect(page.getByRole("link", { name: /^第\d+版$/ })).toHaveCount(2);
  });

  test("ログアウトすると、ページを開いてもログイン画面に戻される", async () => {
    await page.goto("/");
    await page.getByRole("button", { name: "ユーザーメニュー" }).click();
    await page.getByRole("menuitem", { name: "ログアウト" }).click();
    await expectLoginPage(page);

    await page.goto(`/pages/${pageId}`);
    await expectLoginPage(page);
  });
});
