#!/usr/bin/env node
// パスワードを忘れた・二段階認証の端末を紛失したときの復旧用。
//
// 使い方:
//   node scripts/reset-password.mjs <ユーザー名> [新しいパスワード] [--reset-mfa]
//
// 新しいパスワードを省略すると、ランダムなパスワードを作って表示します。
// リセット後は次回ログイン時にパスワードの変更を求められ、ログイン中の端末はすべてログアウトされます。
import { randomBytes, scryptSync } from "node:crypto";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const args = process.argv.slice(2);
const resetMfa = args.includes("--reset-mfa");
const [username, given] = args.filter((a) => !a.startsWith("--"));
if (!username) {
  console.error("使い方: node scripts/reset-password.mjs <ユーザー名> [新しいパスワード] [--reset-mfa]");
  process.exit(1);
}

const password = given ?? randomBytes(12).toString("base64url");
if (password.length < 8 || password.length > 72) {
  console.error("パスワードは 8〜72 文字にしてください。");
  process.exit(1);
}

const file = process.env.WIKI_DB_PATH || path.join(process.env.WIKI_DATA_DIR || path.join(process.cwd(), "storage"), "wiki.sqlite3");
const db = new DatabaseSync(file);
db.exec("PRAGMA busy_timeout = 5000");

// アプリ本体（src/lib/text.ts, src/lib/password.ts）と同じ規則
const key = username.replace(/[\s　]+/g, " ").trim().normalize("NFKC").toLowerCase();
const user = db.prepare("SELECT id, username FROM users WHERE username_key = ?").get(key);
if (!user) {
  console.error(`ユーザー「${username}」が見つかりません。`);
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
const stored = ["scrypt", 16384, 8, 1, salt.toString("base64"), hash.toString("base64")].join("$");

db.exec("BEGIN IMMEDIATE");
db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?").run(stored, new Date().toISOString(), user.id);
if (resetMfa) {
  db.prepare("UPDATE users SET otp_secret = NULL, otp_enabled_at = NULL, otp_backup_codes = '[]', last_otp_step = NULL WHERE id = ?").run(user.id);
}
db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
db.exec("COMMIT");

console.log(`ユーザー「${user.username}」のパスワードをリセットしました${resetMfa ? "（二段階認証も解除）" : ""}。`);
if (!given) console.log(`新しいパスワード: ${password}`);
console.log("次回ログイン時にパスワードの変更を求められます。");
