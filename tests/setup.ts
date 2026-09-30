import fs from "node:fs";
import path from "node:path";

// テストごとに独立したデータ領域（SQLite・秘密鍵）を使う
const base = path.join(process.cwd(), "node_modules", ".cache");
fs.mkdirSync(base, { recursive: true });
process.env.WIKI_DATA_DIR = fs.mkdtempSync(path.join(base, "wiki-test-"));
process.env.SECRET_KEY_BASE = "test-secret-key-base";
process.env.WIKI_ADMIN_PASSWORD = "wikiadmin";
process.env.TZ = "Asia/Tokyo";
