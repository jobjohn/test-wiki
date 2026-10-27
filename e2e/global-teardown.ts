import fs from "node:fs";

// playwright.config.ts が作った、この実行分のデータディレクトリを消す
export default function globalTeardown() {
  const dir = process.env.WIKI_E2E_DATA_DIR;
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
}
