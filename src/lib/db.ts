import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { dataDir } from "./env";
import { MIGRATIONS } from "./migrations";
import { seedFreshDatabase } from "./seed";

type Params = SQLInputValue[];
const globalForDb = globalThis as typeof globalThis & { __wikiDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  return (globalForDb.__wikiDb ??= openDatabase());
}

function openDatabase(): DatabaseSync {
  const sqlite = (process as unknown as { getBuiltinModule(id: string): typeof import("node:sqlite") }).getBuiltinModule(
    "node:sqlite",
  );
  const file = process.env.WIKI_DB_PATH || path.join(dataDir(), "wiki.sqlite3");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new sqlite.DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;");
  migrate(db);
  return db;
}

function migrate(db: DatabaseSync) {
  const current = Number((db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version);
  if (current >= MIGRATIONS.length) return;

  db.exec("BEGIN IMMEDIATE");
  try {
    for (let i = current; i < MIGRATIONS.length; i++) db.exec(MIGRATIONS[i]);
    if (current === 0) seedFreshDatabase(db);
    db.exec(`PRAGMA user_version = ${MIGRATIONS.length}`);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function all<T>(sql: string, ...params: Params): T[] {
  return getDb().prepare(sql).all(...params) as unknown as T[];
}

export function get<T>(sql: string, ...params: Params): T | undefined {
  return getDb().prepare(sql).get(...params) as unknown as T | undefined;
}

export function run(sql: string, ...params: Params): { changes: number; lastInsertRowid: number } {
  const result = getDb().prepare(sql).run(...params);
  return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
}

/** 1 つのトランザクションで実行する（入れ子の場合は外側に合流する） */
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  if (db.isTransaction) return fn();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
