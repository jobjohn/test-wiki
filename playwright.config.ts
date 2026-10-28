import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// 毎回まっさらな DB で始めるため、実行のたびに新しいデータディレクトリを作る。
// 設定ファイルはワーカーでも読み直されるので、環境変数で 1 回分の場所を引き継ぐ（e2e/global-teardown.ts が消す）
const cacheDir = path.join(process.cwd(), "node_modules", ".cache");
fs.mkdirSync(cacheDir, { recursive: true });
const dataDir = (process.env.WIKI_E2E_DATA_DIR ??= fs.mkdtempSync(path.join(cacheDir, "wiki-e2e-")));

// 手元で Playwright が求める版の Chromium が無いときだけ、実在のパスを環境変数で指す（CI では使わない）
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  // DB を共有し、テストが順番に依存するため 1 本ずつ実行する
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "ja-JP",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /a11y\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } },
    },
    // アクセシビリティの検査は、スモークテストで初期設定とページの作成が済んだ DB で行う
    {
      name: "a11y",
      testMatch: /a11y\.spec\.ts$/,
      dependencies: ["chromium"],
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } },
    },
  ],
  // npm run build 済みの本番ビルドを起動する
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://localhost:${PORT}/up`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      WIKI_ADMIN_EMAIL: "e2e@example.com",
      WIKI_ADMIN_PASSWORD: "e2e-password-123",
      WIKI_DATA_DIR: dataDir,
      NODE_OPTIONS: "--disable-warning=ExperimentalWarning",
    },
  },
});
