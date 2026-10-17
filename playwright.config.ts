import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// 毎回まっさらな DB で始めるため、起動のたびに新しいデータディレクトリを作る
const dataDir = path.join(process.cwd(), "node_modules", ".cache", `wiki-e2e-${Date.now()}`);
fs.mkdirSync(dataDir, { recursive: true });

// 手元で Playwright が求める版の Chromium が無いときだけ、実在のパスを環境変数で指す（CI では使わない）
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
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
