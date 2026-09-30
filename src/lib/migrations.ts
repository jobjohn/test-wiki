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
    primary_color TEXT NOT NULL DEFAULT '#2563eb',
    secondary_color TEXT NOT NULL DEFAULT '#ffffff',
    accent_color TEXT NOT NULL DEFAULT '#16a34a',
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
];
