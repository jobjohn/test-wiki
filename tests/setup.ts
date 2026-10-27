import fs from "node:fs";
import path from "node:path";

// テストファイルごとに独立したデータ領域（SQLite・秘密鍵）を使う。
// 親ディレクトリは tests/global-setup.ts が作り、実行の終わりに消す
const base = process.env.WIKI_TEST_RUN_DIR ?? path.join(process.cwd(), "node_modules", ".cache");
fs.mkdirSync(base, { recursive: true });
process.env.WIKI_DATA_DIR = fs.mkdtempSync(path.join(base, "wiki-test-"));
process.env.SECRET_KEY_BASE = "test-secret-key-base";
process.env.WIKI_ADMIN_EMAIL = "admin@example.com";
process.env.WIKI_ADMIN_PASSWORD = "wikiadmin";
process.env.TZ = "Asia/Tokyo";
