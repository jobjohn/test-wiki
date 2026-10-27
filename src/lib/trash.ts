import { all, get, getDb, run, transaction } from "./db";
import { writePageLinks } from "./page-links";
import { NotFoundError, ValidationError } from "./errors";
import { deleteUnusedTags, ensureTag, tagsForPage } from "./pages";
import { normalizeUrl, parseHttpUrl } from "./bookmark-utils";
import { removeUploadFile } from "./uploads";
import { keyOf, now } from "./text";
import { TRASH_RETENTION_DAYS, type TrashKind } from "./trash-utils";

export { TRASH_RETENTION_DAYS };
export type { TrashKind };

/**
 * ゴミ箱（退避テーブル方式）。削除時に、対象の行と関連データを JSON にして trash_items へ退避し、
 * 元の行は実際に削除する。こうすると一覧・検索・リンク解決などの読み取り側は何も変えずに済む。
 * 復元時は元の id で INSERT し直すので、/pages/{id} などのリンクがそのまま戻る。
 */

interface PagePayload {
  page: { title: string; body: string; folder_id: number | null; position: number; lock_version: number; created_at: string; updated_at: string };
  revisions: { number: number; title: string; body: string; summary: string | null; source?: string | null; user_id: number | null; created_at: string }[];
  tags: string[];
}

interface BookmarkPayload {
  bookmark: {
    title: string;
    url: string;
    normalized_url: string;
    description_md: string;
    favicon_url: string | null;
    created_by: number | null;
    updated_by: number | null;
    created_at: string;
    updated_at: string;
  };
  tags: string[];
  /** 変更履歴。履歴ができる前の退避データには無い */
  revisions?: { number: number; title: string; url: string; description_md: string; tags: string; user_id: number | null; source: string | null; summary: string | null; created_at: string }[];
}

interface UploadPayload {
  upload: { filename: string; content_type: string; byte_size: number; storage_key: string; user_id: number | null; created_at: string };
}

function insertTrash(kind: TrashKind, itemId: number, title: string, payload: object, userId: number | null) {
  run(
    "INSERT INTO trash_items (kind, item_id, title, payload, deleted_by, deleted_at) VALUES (?, ?, ?, ?, ?, ?)",
    kind,
    itemId,
    title,
    JSON.stringify(payload),
    userId,
    now(),
  );
}

const userExists = (id: number | null): number | null => (id !== null && get("SELECT 1 FROM users WHERE id = ?", id) ? id : null);

// ---- ゴミ箱へ移す ----

export function trashPage(id: number, userId: number | null) {
  transaction(() => {
    const page = get<PagePayload["page"] & { id: number }>("SELECT * FROM pages WHERE id = ?", id);
    if (!page) throw new NotFoundError("page not found");
    const revisions = all<PagePayload["revisions"][number]>(
      "SELECT number, title, body, summary, source, user_id, created_at FROM revisions WHERE page_id = ? ORDER BY number",
      id,
    ).map((r) => ({ number: r.number, title: r.title, body: r.body, summary: r.summary, source: r.source, user_id: r.user_id, created_at: r.created_at }));
    const payload: PagePayload = {
      page: {
        title: page.title,
        body: page.body,
        folder_id: page.folder_id,
        position: page.position,
        lock_version: page.lock_version,
        created_at: page.created_at,
        updated_at: page.updated_at,
      },
      revisions,
      tags: tagsForPage(id).map((t) => t.name),
    };
    insertTrash("page", id, page.title, payload, userId);
    run("DELETE FROM pages WHERE id = ?", id);
    deleteUnusedTags();
  });
}

export function trashBookmark(id: number, userId: number | null) {
  transaction(() => {
    const row = get<BookmarkPayload["bookmark"] & { id: number }>("SELECT * FROM bookmarks WHERE id = ?", id);
    if (!row) throw new NotFoundError("bookmark not found");
    const tags = all<{ name: string }>(
      "SELECT t.name FROM bookmark_taggings bt JOIN tags t ON t.id = bt.tag_id WHERE bt.bookmark_id = ? ORDER BY t.name_key",
      id,
    ).map((t) => t.name);
    const payload: BookmarkPayload = {
      bookmark: {
        title: row.title,
        url: row.url,
        normalized_url: row.normalized_url,
        description_md: row.description_md,
        favicon_url: row.favicon_url,
        created_by: row.created_by,
        updated_by: row.updated_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      tags,
      revisions: all<NonNullable<BookmarkPayload["revisions"]>[number]>(
        "SELECT number, title, url, description_md, tags, user_id, source, summary, created_at FROM bookmark_revisions WHERE bookmark_id = ? ORDER BY number",
        id,
      ).map((r) => ({ ...r })),
    };
    insertTrash("bookmark", id, row.title, payload, userId);
    run("DELETE FROM bookmarks WHERE id = ?", id);
    deleteUnusedTags();
  });
}

/** アップロードは行だけ退避する。実ファイルは完全削除まで残す */
export function trashUpload(id: number, userId: number | null) {
  transaction(() => {
    const row = get<UploadPayload["upload"] & { id: number }>("SELECT * FROM uploads WHERE id = ?", id);
    if (!row) throw new NotFoundError("upload not found");
    const payload: UploadPayload = {
      upload: {
        filename: row.filename,
        content_type: row.content_type,
        byte_size: row.byte_size,
        storage_key: row.storage_key,
        user_id: row.user_id,
        created_at: row.created_at,
      },
    };
    insertTrash("upload", id, row.filename, payload, userId);
    run("DELETE FROM uploads WHERE id = ?", id);
  });
}

// ---- 一覧 ----

export interface TrashItem {
  id: number;
  kind: TrashKind;
  itemId: number;
  title: string;
  deletedByName: string | null;
  /** ISO 形式。残り日数の計算に使う */
  deletedAt: string;
}

export function listTrash({ kind, limit, offset }: { kind?: TrashKind; limit: number; offset: number }): { items: TrashItem[]; total: number } {
  const where = kind ? "WHERE t.kind = ?" : "";
  const params = kind ? [kind] : [];
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM trash_items t ${where}`, ...params)!.n;
  const rows = all<{ id: number; kind: string; item_id: number; title: string; deleted_by_name: string | null; deleted_at: string }>(
    `SELECT t.id, t.kind, t.item_id, t.title, t.deleted_at, COALESCE(u.display_name, u.email) AS deleted_by_name
     FROM trash_items t LEFT JOIN users u ON u.id = t.deleted_by ${where}
     ORDER BY t.deleted_at DESC, t.id DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset,
  );
  // node:sqlite の行はプロトタイプを持たないため、普通のオブジェクトに詰め替える
  return {
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind as TrashKind,
      itemId: r.item_id,
      title: r.title,
      deletedByName: r.deleted_by_name,
      deletedAt: r.deleted_at,
    })),
    total,
  };
}

export const countTrash = (): number => get<{ n: number }>("SELECT COUNT(*) AS n FROM trash_items")!.n;

// ---- 復元 ----

export interface RestoredItem {
  kind: TrashKind;
  itemId: number;
  title: string;
  /** 復元した先の画面 */
  href: string;
}

export function restoreTrashItem(id: number): RestoredItem {
  return transaction(() => {
    const item = get<{ id: number; kind: TrashKind; item_id: number; title: string; payload: string }>("SELECT * FROM trash_items WHERE id = ?", id);
    if (!item) throw new NotFoundError("trash item not found");
    let payload: unknown;
    try {
      payload = JSON.parse(item.payload);
    } catch {
      throw new ValidationError("ゴミ箱のデータが壊れているため復元できません");
    }
    let href: string;
    if (item.kind === "page") {
      restorePage(item.item_id, payload as PagePayload);
      href = `/pages/${item.item_id}`;
    } else if (item.kind === "bookmark") {
      restoreBookmark(item.item_id, payload as BookmarkPayload);
      href = `/bookmarks/${item.item_id}`;
    } else {
      restoreUpload(item.item_id, payload as UploadPayload);
      href = "/uploads";
    }
    run("DELETE FROM trash_items WHERE id = ?", id);
    return { kind: item.kind, itemId: item.item_id, title: item.title, href };
  });
}

function restorePage(id: number, { page, revisions, tags }: PagePayload) {
  const clash = get<{ id: number }>("SELECT id FROM pages WHERE title_key = ?", keyOf(page.title));
  if (clash) throw new ValidationError(`同じタイトルのページ「${page.title}」が既にあるため、復元できません。先にどちらかのタイトルを変えてください`);
  // フォルダが消えていればルートに戻す
  const folderId = page.folder_id !== null && get("SELECT 1 FROM folders WHERE id = ?", page.folder_id) ? page.folder_id : null;
  run(
    `INSERT INTO pages (id, title, title_key, body, folder_id, position, lock_version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    page.title,
    keyOf(page.title),
    page.body,
    folderId,
    page.position,
    page.lock_version,
    page.created_at,
    page.updated_at,
  );
  for (const r of revisions) {
    run(
      "INSERT INTO revisions (page_id, user_id, number, title, body, summary, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      id,
      userExists(r.user_id),
      r.number,
      r.title,
      r.body,
      r.summary,
      // 書き込み元を持たない古い退避データは画面からの版として戻す
      r.source ?? null,
      r.created_at,
    );
  }
  // 退避時に未使用のタグが掃除されていても、名前から作り直す
  for (const name of tags) run("INSERT OR IGNORE INTO taggings (page_id, tag_id) VALUES (?, ?)", id, ensureTag(name));
  writePageLinks(getDb(), id, page.body);
}

function restoreBookmark(id: number, { bookmark: b, tags, revisions }: BookmarkPayload) {
  // 正規化の規則が将来変わっても衝突を見逃さないよう、保存済みの URL から計算し直した値も調べる
  const parsed = parseHttpUrl(b.url);
  const keys = [...new Set([b.normalized_url, ...(parsed ? [normalizeUrl(parsed)] : [])])];
  for (const key of keys) {
    const clash = get<{ title: string }>("SELECT title FROM bookmarks WHERE normalized_url = ?", key);
    if (clash) throw new ValidationError(`同じ URL のリンク「${clash.title}」が既にあるため、復元できません`);
  }
  run(
    `INSERT INTO bookmarks (id, title, title_key, url, normalized_url, description_md, favicon_url, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    b.title,
    keyOf(b.title),
    b.url,
    b.normalized_url,
    b.description_md,
    b.favicon_url,
    userExists(b.created_by),
    userExists(b.updated_by),
    b.created_at,
    b.updated_at,
  );
  for (const name of tags) run("INSERT OR IGNORE INTO bookmark_taggings (bookmark_id, tag_id) VALUES (?, ?)", id, ensureTag(name));
  // 古い形式の退避データ（履歴なし）は、現在の内容を第 1 版にする
  const history = revisions?.length
    ? revisions
    : [{ number: 1, title: b.title, url: b.url, description_md: b.description_md, tags: tags.join(","), user_id: b.updated_by, source: null, summary: null, created_at: b.updated_at }];
  for (const r of history) {
    run(
      `INSERT INTO bookmark_revisions (bookmark_id, number, title, url, description_md, tags, user_id, source, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      r.number,
      r.title,
      r.url,
      r.description_md,
      r.tags,
      userExists(r.user_id),
      r.source,
      r.summary,
      r.created_at,
    );
  }
}

function restoreUpload(id: number, { upload: u }: UploadPayload) {
  run(
    "INSERT INTO uploads (id, filename, content_type, byte_size, storage_key, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    id,
    u.filename,
    u.content_type,
    u.byte_size,
    u.storage_key,
    userExists(u.user_id),
    u.created_at,
  );
}

// ---- 完全削除 ----

/** アップロードの実ファイルは、DB のコミット後に消す（途中で失敗しても行と実ファイルが食い違わないように） */
function removeFiles(rows: { kind: string; payload: string }[]) {
  for (const row of rows) {
    if (row.kind !== "upload") continue;
    // 1 件の失敗で残りを止めない（DB の行は既に消えているため、続けて消せるものは消す）
    try {
      const { upload } = JSON.parse(row.payload) as UploadPayload;
      removeUploadFile(upload.storage_key);
    } catch (error) {
      console.error("ゴミ箱: アップロードの実ファイルを削除できませんでした", error);
    }
  }
}

export function purgeTrashItem(id: number) {
  const row = transaction(() => {
    const found = get<{ kind: string; payload: string }>("SELECT kind, payload FROM trash_items WHERE id = ?", id);
    if (!found) throw new NotFoundError("trash item not found");
    run("DELETE FROM trash_items WHERE id = ?", id);
    return found;
  });
  removeFiles([row]);
}

/** ゴミ箱を空にする。消した件数を返す */
export function emptyTrash(): number {
  const rows = transaction(() => {
    const found = all<{ kind: string; payload: string }>("SELECT kind, payload FROM trash_items");
    run("DELETE FROM trash_items");
    return found.map((r) => ({ kind: r.kind, payload: r.payload }));
  });
  removeFiles(rows);
  return rows.length;
}

const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let lastPurgeAt = 0;

/**
 * 保持期間（30 日）を過ぎたものを完全に削除する。消した件数を返す。
 * now を省いた（実運用の）呼び出しは、プロセス内で 1 時間に 1 回までに抑える。
 */
export function purgeExpiredTrash(at?: Date): number {
  if (!at) {
    const current = Date.now();
    if (current - lastPurgeAt < PURGE_INTERVAL_MS) return 0;
    lastPurgeAt = current;
  }
  const cutoff = new Date((at ?? new Date()).getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const rows = transaction(() => {
    const found = all<{ kind: string; payload: string }>("SELECT kind, payload FROM trash_items WHERE deleted_at < ?", cutoff);
    run("DELETE FROM trash_items WHERE deleted_at < ?", cutoff);
    return found.map((r) => ({ kind: r.kind, payload: r.payload }));
  });
  removeFiles(rows);
  return rows.length;
}

/** 期限切れの掃除。失敗しても呼び出し元の操作（削除・画面表示）は止めず、ログだけ残す */
export function safePurge() {
  try {
    purgeExpiredTrash();
  } catch (error) {
    console.error("ゴミ箱: 期限切れの項目を削除できませんでした", error);
  }
}
