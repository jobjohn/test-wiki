import { createHash, randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const EMAIL = "e2e@example.com";
const PASSWORD = "e2e-password-123";

/** ログインする（このファイルだけを実行したときは、初期設定も済ませる） */
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

const sha = (data: Buffer) => createHash("sha256").update(data).digest("hex");

test.describe("ファイルのアップロード", () => {
  test("10MB を超えるファイルも切り詰められずに保存され、そのまま取り出せる", async ({ page, baseURL }) => {
    await login(page);
    const data = randomBytes(12 * 1024 * 1024);
    const response = await page.request.post("/api/uploads", {
      data,
      headers: { "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent("大きい.bin"), Origin: baseURL! },
    });
    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.name).toBe("大きい.bin");

    const download = await page.request.get(json.url);
    expect(download.status()).toBe(200);
    const body = await download.body();
    expect(body.length).toBe(data.length);
    expect(sha(body)).toBe(sha(data));

    // 新しいリンクは推測できない鍵の URL。以前の番号の URL も開ける（既に貼られたリンクを壊さない）
    expect(json.url).toMatch(/^\/files\/k\/[A-Za-z0-9_-]{24}\//);
    const legacy = await page.request.get(`/files/${json.id}/x`, { headers: { Range: "bytes=0-9" } });
    expect(legacy.status()).toBe(206);
    expect(await legacy.body()).toEqual(data.subarray(0, 10));
  });

  test("上限を超えるファイルは 413 で断る", async ({ page, baseURL }) => {
    await login(page);
    const response = await page.request.post("/api/uploads", {
      data: Buffer.alloc(21 * 1024 * 1024),
      headers: { "Content-Type": "application/octet-stream", "X-File-Name": "too-big.bin", Origin: baseURL! },
    });
    expect(response.status()).toBe(413);
  });

  test("画面からアップロードしたファイルが一覧に出て、未参照で絞り込める", async ({ page }) => {
    await login(page);
    await page.goto("/uploads");
    const name = `e2e-${Date.now()}.txt`;
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "ファイルを選択" }).click();
    await (await chooser).setFiles({ name, mimeType: "text/plain", buffer: Buffer.from("e2e upload") });
    await expect(page.getByRole("link", { name })).toBeVisible();

    await page.getByRole("link", { name: "どこからも参照されていないもの" }).click();
    await expect(page).toHaveURL(/filter=unreferenced/);
    const row = page.getByRole("row").filter({ has: page.getByRole("link", { name }) });
    await expect(row.getByText("未参照")).toBeVisible();
  });
});
