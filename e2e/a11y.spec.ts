import AxeBuilder from "@axe-core/playwright";
import { type Browser, type BrowserContext, expect, test, type Page } from "@playwright/test";

const EMAIL = "e2e@example.com";
const PASSWORD = "e2e-password-123";
const TITLE = "E2E スモークページ";
// WCAG 2.1 の A / AA を対象にする
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  // 失敗したときに、どの規則のどの要素か・なぜかが分かるようにまとめる
  const summary = violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(" ")} — ${n.failureSummary?.split("\n").pop()?.trim()}`).join("\n  ")}`,
  );
  // 1 画面で止めず、同じテスト内の他の画面の結果もまとめて出す
  expect.soft(summary, page.url()).toEqual([]);
}

// ログイン済みの状態（Cookie）を 1 回だけ作り、各テストで新しいコンテキストに読み込む
let storageState: Awaited<ReturnType<BrowserContext["storageState"]>>;
async function loggedInPage(browser: Browser): Promise<Page> {
  // axe はフレームごとに調べるため、browser.newPage() ではなくコンテキストからページを作る
  const context = await browser.newContext({ storageState });
  return context.newPage();
}

// smoke.spec.ts（初期設定・ページの作成）の後に、同じ DB で実行される（playwright.config.ts の a11y プロジェクト）
test.describe("アクセシビリティ（axe）", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: "ログイン", exact: true }).click();
    await expect(page.getByRole("button", { name: "ユーザーメニュー" })).toBeVisible();
    storageState = await context.storageState();
    await context.close();
  });

  test("ログイン画面", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    await expectNoViolations(page);
  });

  test("ホーム（本文へスキップのリンクで本文へ移れる）", async ({ browser }) => {
    const page = await loggedInPage(browser);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoViolations(page);

    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "本文へスキップ" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("検索・ページの表示・編集・履歴", async ({ browser }) => {
    const page = await loggedInPage(browser);
    await page.goto(`/search?q=${encodeURIComponent("E2E")}`);
    await expectNoViolations(page);

    await page.getByRole("main").getByRole("link", { name: TITLE }).click();
    await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
    const url = page.url();
    await expectNoViolations(page);

    await page.goto(`${url}/edit`);
    await expect(page.locator("#body")).toBeVisible();
    await expectNoViolations(page);

    await page.goto(`${url}/revisions`);
    await expectNoViolations(page);
  });

  test("404 画面", async ({ browser }) => {
    const page = await loggedInPage(browser);
    await page.goto("/pages/999999");
    await expect(page.getByRole("main")).toHaveCount(1);
    await expectNoViolations(page);
  });
});
