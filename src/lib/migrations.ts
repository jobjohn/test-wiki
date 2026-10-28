import type { DatabaseSync } from "node:sqlite";
import { rebuildPageLinks } from "./page-links";

/**
 * スキーマ定義。PRAGMA user_version に適用済みの件数を記録し、
 * 未適用のものを起動時に順番に適用する。既存の項目は変更せず、末尾に追加すること。
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL,
    display_name TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor',
    otp_secret TEXT,
    otp_enabled_at TEXT,
    otp_backup_codes TEXT NOT NULL DEFAULT '[]',
    last_otp_step INTEGER,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    last_sign_in_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX index_users_on_username_key ON users(username_key);

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pending_mfa INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX index_sessions_on_user_id ON sessions(user_id);

  CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    wiki_name TEXT NOT NULL DEFAULT 'Wiki',
    description TEXT,
    primary_color TEXT NOT NULL DEFAULT '#008236',
    secondary_color TEXT NOT NULL DEFAULT '#ffffff',
    accent_color TEXT NOT NULL DEFAULT '#474739',
    color_mode TEXT NOT NULL DEFAULT 'system',
    public_read INTEGER NOT NULL DEFAULT 0,
    require_mfa INTEGER NOT NULL DEFAULT 0,
    setup_completed_at TEXT
  );

  CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL,
    parent_id INTEGER REFERENCES folders(id),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX index_folders_on_parent_and_name ON folders(COALESCE(parent_id, 0), name_key);

  CREATE TABLE pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    title_key TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    folder_id INTEGER REFERENCES folders(id),
    position INTEGER NOT NULL DEFAULT 0,
    lock_version INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX index_pages_on_title_key ON pages(title_key);
  CREATE INDEX index_pages_on_folder_id ON pages(folder_id);
  CREATE INDEX index_pages_on_updated_at ON pages(updated_at);

  CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL
  );
  CREATE UNIQUE INDEX index_tags_on_name_key ON tags(name_key);

  CREATE TABLE taggings (
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (page_id, tag_id)
  );
  CREATE INDEX index_taggings_on_tag_id ON taggings(tag_id);

  CREATE TABLE revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    summary TEXT,
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX index_revisions_on_page_and_number ON revisions(page_id, number);
  CREATE INDEX index_revisions_on_created_at ON revisions(created_at);

  CREATE TABLE uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    storage_key TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );
  `,
  // カラーテーマ機能の廃止（配色は固定）
  `
  ALTER TABLE settings DROP COLUMN primary_color;
  ALTER TABLE settings DROP COLUMN secondary_color;
  ALTER TABLE settings DROP COLUMN accent_color;
  `,
  // メールアドレスでのログイン、ロール（一般・管理者）、ステータス（有効・無効）
  `
  ALTER TABLE users RENAME COLUMN username TO email;
  ALTER TABLE users RENAME COLUMN username_key TO email_key;
  ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
  UPDATE users SET email = 'admin@example.com' WHERE email_key = 'wikiadmin';
  UPDATE users SET email = email || '@example.com' WHERE email NOT LIKE '%@%';
  UPDATE users SET email_key = lower(email);
  UPDATE users SET role = 'general' WHERE role != 'admin';
  DROP INDEX index_users_on_username_key;
  CREATE UNIQUE INDEX index_users_on_email_key ON users(email_key);
  `,
  // 共有リンク集（タグは Wiki ページと同じ tags を使う）
  `
  CREATE TABLE bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    title_key TEXT NOT NULL,
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    description_md TEXT NOT NULL DEFAULT '',
    favicon_url TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX index_bookmarks_on_normalized_url ON bookmarks(normalized_url);
  CREATE INDEX index_bookmarks_on_created_at ON bookmarks(created_at);
  CREATE INDEX index_bookmarks_on_updated_at ON bookmarks(updated_at);
  CREATE INDEX index_bookmarks_on_title_key ON bookmarks(title_key);

  CREATE TABLE bookmark_taggings (
    bookmark_id INTEGER NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (bookmark_id, tag_id)
  );
  CREATE INDEX index_bookmark_taggings_on_tag_id ON bookmark_taggings(tag_id);
  `,
  // MCP などの外部ツール用アクセストークン（平文は保存せず、SHA-256 のハッシュだけ持つ）
  `
  CREATE TABLE api_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    token_prefix TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'read',
    expires_at TEXT,
    last_used_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX index_api_tokens_on_user_id ON api_tokens(user_id);
  `,
  // ゴミ箱（削除の取り消し）。削除した行と関連データを JSON にして退避し、元の行は実際に削除する
  `
  CREATE TABLE trash_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    payload TEXT NOT NULL,
    deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX index_trash_items_on_kind_and_item_id ON trash_items(kind, item_id);
  CREATE INDEX index_trash_items_on_deleted_at ON trash_items(deleted_at);
  `,
  // MCP からの書き込み（フェーズ 2）。設定・版の書き込み元・書き込みの監査ログ
  // api_write_logs は、トークンを取り消した後も記録が残るよう api_token_id を外部キーにしない
  `
  ALTER TABLE settings ADD COLUMN mcp_write_enabled INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE revisions ADD COLUMN source TEXT;

  CREATE TABLE api_write_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_token_id INTEGER,
    token_name TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tool TEXT NOT NULL,
    target_kind TEXT NOT NULL,
    target_id INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE INDEX index_api_write_logs_on_created_at ON api_write_logs(created_at);
  CREATE INDEX index_api_write_logs_on_user_id ON api_write_logs(user_id);
  `,
  // リンクの変更履歴（元に戻せるようにする）。既存のリンクは、今の内容を第 1 版にする
  `
  CREATE TABLE bookmark_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookmark_id INTEGER NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description_md TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    source TEXT,
    summary TEXT,
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX index_bookmark_revisions_on_bookmark_and_number ON bookmark_revisions(bookmark_id, number);

  INSERT INTO bookmark_revisions (bookmark_id, number, title, url, description_md, tags, user_id, source, summary, created_at)
  SELECT b.id, 1, b.title, b.url, b.description_md,
    COALESCE((SELECT group_concat(t.name, ',' ORDER BY t.name_key) FROM bookmark_taggings bt JOIN tags t ON t.id = bt.tag_id WHERE bt.bookmark_id = b.id), ''),
    b.updated_by, NULL, NULL, b.updated_at
  FROM bookmarks b;
  `,
  // 全文検索（FTS5・trigram で日本語も部分一致）とバックリンク（[[リンク]] の索引）
  // pages_fts は pages を元にした外部コンテンツ表で、トリガーで同期する。page_links はアプリ側で保存時に書き直す
  `
  CREATE VIRTUAL TABLE pages_fts USING fts5(title, body, content='pages', content_rowid='id', tokenize='trigram');
  INSERT INTO pages_fts(pages_fts) VALUES ('rebuild');
  CREATE TRIGGER pages_fts_after_insert AFTER INSERT ON pages BEGIN
    INSERT INTO pages_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
  END;
  CREATE TRIGGER pages_fts_after_delete AFTER DELETE ON pages BEGIN
    INSERT INTO pages_fts(pages_fts, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
  END;
  CREATE TRIGGER pages_fts_after_update AFTER UPDATE OF title, body ON pages BEGIN
    INSERT INTO pages_fts(pages_fts, rowid, title, body) VALUES ('delete', old.id, old.title, old.body);
    INSERT INTO pages_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
  END;

  CREATE TABLE page_links (
    source_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    target_key TEXT NOT NULL,
    PRIMARY KEY (source_id, target_key)
  );
  CREATE INDEX index_page_links_on_target_key ON page_links(target_key);
  `,
  // ページの「いいね!」（ログインユーザーごとに 1 回）。ページ・ユーザーの削除で一緒に消える
  `
  CREATE TABLE page_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE (page_id, user_id)
  );
  CREATE INDEX index_page_likes_on_user_id ON page_likes(user_id);
  `,
];

/** SQL だけでは書けない移行処理。キーは MIGRATIONS の添字で、その SQL の直後（初期データ投入の後）に実行する */
export const MIGRATION_BACKFILLS: Record<number, (db: DatabaseSync) => void> = {
  [MIGRATIONS.findIndex((sql) => sql.includes("CREATE TABLE page_links"))]: rebuildPageLinks,
};
