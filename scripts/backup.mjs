#!/usr/bin/env node
// 動いたままの Wiki から、整合の取れたバックアップを作る。
//
// 使い方:
//   node scripts/backup.mjs [出力先ディレクトリ]
//
// 出力先を省略すると、データディレクトリの backups/<日時>/ に作ります。
// SQLite は WAL モードで、本体・-wal・-shm をそのままコピーすると書き込み中の状態を拾って壊れることがあるため、
// VACUUM INTO で 1 つのトランザクションから見た時点のデータベースを書き出します（アプリを止める必要はありません）。
// アップロードファイル（files/）と秘密鍵などのその他のファイルは、データベースを書き出した後にコピーします。
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DB_NAME = "wiki.sqlite3";
const dataDir = path.resolve(process.env.WIKI_DATA_DIR || path.join(process.cwd(), "storage"));
const dbFile = path.resolve(process.env.WIKI_DB_PATH || path.join(dataDir, DB_NAME));
const backupsDir = path.join(dataDir, "backups");

const [given] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (process.argv.includes("--help")) {
  console.log("使い方: node scripts/backup.mjs [出力先ディレクトリ]");
  process.exit(0);
}
if (!fs.existsSync(dbFile)) {
  console.error(`データベースが見つかりません: ${dbFile}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const outDir = path.resolve(given ?? path.join(backupsDir, stamp));
if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
  console.error(`出力先が空ではありません: ${outDir}`);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });

// 1. データベース（VACUUM INTO は読み取りトランザクションで動くので、アプリの書き込みを止めない）
const outDb = path.join(outDir, DB_NAME);
const db = new DatabaseSync(dbFile, { readOnly: true });
db.exec("PRAGMA busy_timeout = 5000");
db.prepare("VACUUM INTO ?").run(outDb);
db.close();
fs.chmodSync(outDb, 0o600);

const copy = new DatabaseSync(outDb, { readOnly: true });
const check = copy.prepare("PRAGMA integrity_check").all().map((r) => Object.values(r)[0]);
const keys = copy.prepare("SELECT storage_key FROM uploads").all().map((r) => r.storage_key);
copy.close();
if (check.length !== 1 || check[0] !== "ok") {
  console.error(`書き出したデータベースの整合性チェックに失敗しました: ${check.join(" / ")}`);
  process.exit(1);
}

// 2. その他のファイル（files/ の添付・秘密鍵など）。データベース本体と backups/、出力先そのものは除く
const skip = new Set([DB_NAME, `${DB_NAME}-wal`, `${DB_NAME}-shm`, `${DB_NAME}-journal`]);
let fileCount = 0;
function copyTree(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (src === backupsDir || src === outDir) continue;
    if (from === dataDir && skip.has(entry.name)) continue;
    if (entry.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true, mode: 0o700 });
      copyTree(src, dest);
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dest);
      fileCount++;
    }
  }
}
copyTree(dataDir, outDir);

// 3. データベースが参照している添付ファイルがそろっているか
const missing = keys.filter((key) => !fs.existsSync(path.join(outDir, "files", key)));

console.log(`バックアップを作成しました: ${outDir}`);
console.log(`  データベース: ${DB_NAME}（整合性チェック OK）`);
console.log(`  その他のファイル: ${fileCount} 件（添付 ${keys.length - missing.length}/${keys.length} 件）`);
if (missing.length) {
  console.warn(`  注意: データベースが参照している添付ファイルのうち ${missing.length} 件が見つかりませんでした（バックアップ中に削除された可能性があります）。`);
}
