import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { MIGRATIONS } from "@/lib/migrations";

describe("マイグレーション", () => {
  it("ユーザー名のユーザーをメールアドレスに、編集者・閲覧者を一般に移行し、全員を有効にする", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(MIGRATIONS[0]);
    db.exec(MIGRATIONS[1]);
    const insert = db.prepare(
      "INSERT INTO users (username, username_key, password_hash, role, created_at, updated_at) VALUES (?, ?, 'x', ?, 't', 't')",
    );
    insert.run("wikiadmin", "wikiadmin", "admin");
    insert.run("Taro", "taro", "editor");
    insert.run("hana@example.org", "hana@example.org", "viewer");

    for (const sql of MIGRATIONS.slice(2)) db.exec(sql);

    const rows = db.prepare("SELECT email, email_key, role, status FROM users ORDER BY id").all();
    expect(rows.map((r) => ({ ...r }))).toEqual([
      { email: "admin@example.com", email_key: "admin@example.com", role: "admin", status: "active" },
      { email: "Taro@example.com", email_key: "taro@example.com", role: "general", status: "active" },
      { email: "hana@example.org", email_key: "hana@example.org", role: "general", status: "active" },
    ]);
    // メールアドレスは大文字・小文字を区別せず一意
    expect(() =>
      db.prepare("INSERT INTO users (email, email_key, password_hash, created_at, updated_at) VALUES ('X', 'taro@example.com', 'x', 't', 't')").run(),
    ).toThrow(/UNIQUE/);
  });

  it("既存のデータベースにリンク集のテーブルを追加し、同じ URL・同じタグの重複を防ぐ", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    for (const sql of MIGRATIONS.slice(0, 3)) db.exec(sql);
    db.prepare("INSERT INTO tags (name, name_key) VALUES ('開発', '開発')").run();
    for (const sql of MIGRATIONS.slice(3)) db.exec(sql);

    const insert = db.prepare(
      "INSERT INTO bookmarks (title, title_key, url, normalized_url, created_at, updated_at) VALUES ('A', 'a', 'https://a.example/', 'https://a.example', 't', 't')",
    );
    const id = Number(insert.run().lastInsertRowid);
    expect(() => insert.run()).toThrow(/UNIQUE/);
    db.prepare("INSERT INTO bookmark_taggings (bookmark_id, tag_id) VALUES (?, 1)").run(id);
    expect(() => db.prepare("INSERT INTO bookmark_taggings (bookmark_id, tag_id) VALUES (?, 1)").run(id)).toThrow(/UNIQUE|PRIMARY/);
    // リンクを消すと、タグ付けも消える
    db.prepare("DELETE FROM bookmarks WHERE id = ?").run(id);
    expect(db.prepare("SELECT COUNT(*) AS n FROM bookmark_taggings").get()).toEqual(expect.objectContaining({ n: 0 }));
  });

  it("既存のデータベースにゴミ箱のテーブルを追加し、同じ項目の二重退避を防ぐ", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    const trashIndex = MIGRATIONS.findIndex((sql) => sql.includes("CREATE TABLE trash_items"));
    expect(trashIndex).toBeGreaterThanOrEqual(0);
    for (const sql of MIGRATIONS.slice(0, trashIndex)) db.exec(sql);
    db.prepare("INSERT INTO users (email, email_key, password_hash, created_at, updated_at) VALUES ('a@example.com', 'a@example.com', 'x', 't', 't')").run();
    db.prepare("INSERT INTO pages (title, title_key, created_at, updated_at) VALUES ('P', 'p', 't', 't')").run();

    db.exec(MIGRATIONS[trashIndex]);

    // 既存のデータはそのまま
    expect(db.prepare("SELECT COUNT(*) AS n FROM pages").get()).toEqual(expect.objectContaining({ n: 1 }));
    const insert = db.prepare("INSERT INTO trash_items (kind, item_id, title, payload, deleted_by, deleted_at) VALUES (?, ?, 'T', '{}', 1, 't')");
    insert.run("page", 5);
    insert.run("bookmark", 5);
    expect(() => insert.run("page", 5)).toThrow(/UNIQUE/);
    // 削除した人のユーザーを消しても、ゴミ箱の項目は残る
    db.prepare("DELETE FROM users WHERE id = 1").run();
    expect(db.prepare("SELECT deleted_by FROM trash_items WHERE kind = 'page'").get()).toEqual(expect.objectContaining({ deleted_by: null }));
  });

  it("既存のデータベースに MCP 書き込みの設定・版の書き込み元・監査ログを追加する（既存の行は壊さない）", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    const index = MIGRATIONS.findIndex((sql) => sql.includes("CREATE TABLE api_write_logs"));
    expect(index).toBeGreaterThanOrEqual(0);
    // ゴミ箱のマイグレーションより後ろにあること（この後にマイグレーションが増えても壊れない）
    expect(index).toBeGreaterThan(MIGRATIONS.findIndex((sql) => sql.includes("CREATE TABLE trash_items")));
    for (const sql of MIGRATIONS.slice(0, index)) db.exec(sql);
    db.prepare("INSERT INTO settings (id) VALUES (1)").run();
    db.prepare("INSERT INTO users (email, email_key, password_hash, created_at, updated_at) VALUES ('a@example.com', 'a@example.com', 'x', 't', 't')").run();
    db.prepare("INSERT INTO pages (title, title_key, created_at, updated_at) VALUES ('P', 'p', 't', 't')").run();
    db.prepare("INSERT INTO revisions (page_id, number, title, body, created_at) VALUES (1, 1, 'P', '', 't')").run();

    db.exec(MIGRATIONS[index]);

    // 既存の設定は書き込み無効、既存の版は画面からのもの
    expect(db.prepare("SELECT mcp_write_enabled FROM settings WHERE id = 1").get()).toEqual(expect.objectContaining({ mcp_write_enabled: 0 }));
    expect(db.prepare("SELECT source FROM revisions").get()).toEqual(expect.objectContaining({ source: null }));
    // api_token_id は外部キーではないので、トークンがなくても記録できる。ユーザーを消してもログは残る
    db.prepare(
      "INSERT INTO api_write_logs (api_token_id, token_name, user_id, tool, target_kind, target_id, created_at) VALUES (99, 'T', 1, 'create_page', 'page', 1, 't')",
    ).run();
    db.prepare("DELETE FROM users WHERE id = 1").run();
    expect(db.prepare("SELECT user_id FROM api_write_logs").get()).toEqual(expect.objectContaining({ user_id: null }));
  });
});
