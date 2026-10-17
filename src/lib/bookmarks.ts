import { all, get, run, transaction } from "./db";
import { NotFoundError, ValidationError } from "./errors";
import { deleteUnusedTags, ensureTag, type Tag } from "./pages";
import {
  BOOKMARK_DESCRIPTION_MAX_LENGTH,
  BOOKMARK_TAGS_MAX,
  BOOKMARK_TITLE_MAX_LENGTH,
  type BookmarkSort,
  isValidFavicon,
  normalizeUrl,
  parseHttpUrl,
} from "./bookmark-utils";
import { escapeLike, keyOf, normalizeBody, now, parseTagList, squish } from "./text";

export interface Bookmark {
  id: number;
  title: string;
  url: string;
  descriptionMd: string;
  faviconUrl: string | null;
  createdBy: number | null;
  createdByName: string | null;
  updatedBy: number | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

interface BookmarkRow {
  id: number;
  title: string;
  url: string;
  description_md: string;
  favicon_url: string | null;
  created_by: number | null;
  created_by_name: string | null;
  updated_by: number | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT = `SELECT b.id, b.title, b.url, b.description_md, b.favicon_url, b.created_by, b.updated_by, b.created_at, b.updated_at,
  COALESCE(cu.display_name, cu.email) AS created_by_name, COALESCE(uu.display_name, uu.email) AS updated_by_name
  FROM bookmarks b LEFT JOIN users cu ON cu.id = b.created_by LEFT JOIN users uu ON uu.id = b.updated_by`;

const mapBookmark = (row: BookmarkRow, tags: Tag[]): Bookmark => ({
  id: row.id,
  title: row.title,
  url: row.url,
  descriptionMd: row.description_md,
  faviconUrl: row.favicon_url,
  createdBy: row.created_by,
  createdByName: row.created_by_name,
  updatedBy: row.updated_by,
  updatedByName: row.updated_by_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  tags,
});

function tagsForBookmarks(ids: number[]): Map<number, Tag[]> {
  const map = new Map<number, Tag[]>();
  if (!ids.length) return map;
  const rows = all<{ bookmark_id: number; id: number; name: string }>(
    `SELECT bt.bookmark_id, t.id, t.name FROM bookmark_taggings bt JOIN tags t ON t.id = bt.tag_id
     WHERE bt.bookmark_id IN (${ids.map(() => "?").join(",")}) ORDER BY t.name_key`,
    ...ids,
  );
  for (const row of rows) map.set(row.bookmark_id, [...(map.get(row.bookmark_id) ?? []), { id: row.id, name: row.name }]);
  return map;
}

const withTags = (rows: BookmarkRow[]): Bookmark[] => {
  const tags = tagsForBookmarks(rows.map((r) => r.id));
  return rows.map((row) => mapBookmark(row, tags.get(row.id) ?? []));
};

// ---- 取得 ----

export const getBookmark = (id: number): Bookmark | undefined => {
  const row = get<BookmarkRow>(`${SELECT} WHERE b.id = ?`, id);
  return row && withTags([row])[0];
};

/** 同じ URL（正規化後）のリンク。excludeId は編集中のリンク自身 */
export function findBookmarkByUrl(url: string, excludeId?: number): { id: number; title: string } | undefined {
  const parsed = parseHttpUrl(url);
  if (!parsed) return undefined;
  const row = get<{ id: number; title: string }>("SELECT id, title FROM bookmarks WHERE normalized_url = ?", normalizeUrl(parsed));
  return row && row.id !== excludeId ? { id: row.id, title: row.title } : undefined;
}

export const countBookmarks = (): number => get<{ n: number }>("SELECT COUNT(*) AS n FROM bookmarks")!.n;

export interface BookmarkQuery {
  query?: string;
  tag?: string;
  sort?: BookmarkSort;
  limit: number;
  offset: number;
}

const ORDER: Record<BookmarkSort, string> = {
  new: "b.created_at DESC, b.id DESC",
  updated: "b.updated_at DESC, b.id DESC",
  title: "b.title_key, b.id",
};

/**
 * 一覧・検索。キーワードは空白区切りで AND、それぞれタイトル・URL・説明のどれかに含まれるもの
 * （英字の大文字小文字は区別しない）。タグは名前で絞り込む。
 */
export function listBookmarks({ query = "", tag = "", sort = "new", limit, offset }: BookmarkQuery): { bookmarks: Bookmark[]; total: number } {
  const where: string[] = [];
  const params: (string | number)[] = [];
  for (const term of query.split(/[\s　]+/).filter(Boolean).slice(0, 10)) {
    where.push("(b.title LIKE ? ESCAPE '\\' OR b.url LIKE ? ESCAPE '\\' OR b.description_md LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(term)}%`;
    params.push(like, like, like);
  }
  if (tag.trim()) {
    where.push("EXISTS (SELECT 1 FROM bookmark_taggings bt JOIN tags t ON t.id = bt.tag_id WHERE bt.bookmark_id = b.id AND t.name_key = ?)");
    params.push(keyOf(tag));
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM bookmarks b ${clause}`, ...params)!.n;
  const rows = all<BookmarkRow>(`${SELECT} ${clause} ORDER BY ${ORDER[sort]} LIMIT ? OFFSET ?`, ...params, limit, offset);
  return { bookmarks: withTags(rows), total };
}

/** リンク集で使われているタグ（絞り込みの候補）。画面の部品へ渡すため、普通のオブジェクトにする */
export const listBookmarkTags = (): (Tag & { count: number })[] =>
  all<{ id: number; name: string; count: number }>(
    `SELECT t.id, t.name, COUNT(bt.bookmark_id) AS count FROM tags t JOIN bookmark_taggings bt ON bt.tag_id = t.id
     GROUP BY t.id ORDER BY t.name_key`,
  ).map(({ id, name, count }) => ({ id, name, count }));

// ---- 作成・更新・削除 ----

export interface BookmarkInput {
  url: string;
  title: string;
  descriptionMd: string;
  tags: string;
  /** 自動取得したファビコン（data: URI）。空なら保存しない */
  faviconUrl: string;
  userId: number | null;
}

function validate(input: BookmarkInput, id?: number) {
  const errors: string[] = [];
  const url = parseHttpUrl(input.url);
  if (!input.url.trim()) errors.push("URL を入力してください");
  else if (!url) errors.push("URL は http:// または https:// で始まる正しい形式で入力してください");
  const title = squish(input.title);
  if (!title) errors.push("タイトルを入力してください");
  if (title.length > BOOKMARK_TITLE_MAX_LENGTH) errors.push(`タイトルは ${BOOKMARK_TITLE_MAX_LENGTH} 文字以内にしてください`);
  const descriptionMd = normalizeBody(input.descriptionMd).trim();
  if (descriptionMd.length > BOOKMARK_DESCRIPTION_MAX_LENGTH) errors.push(`説明は ${BOOKMARK_DESCRIPTION_MAX_LENGTH} 文字以内にしてください`);
  const tags = parseTagList(input.tags);
  if (tags.length > BOOKMARK_TAGS_MAX) errors.push(`タグは ${BOOKMARK_TAGS_MAX} 個までにしてください`);
  const normalizedUrl = url ? normalizeUrl(url) : "";
  if (url) {
    const clash = get<{ id: number; title: string }>("SELECT id, title FROM bookmarks WHERE normalized_url = ?", normalizedUrl);
    if (clash && clash.id !== id) errors.push(`この URL は「${clash.title}」として登録済みです`);
  }
  if (errors.length) throw new ValidationError(errors);
  const faviconUrl = input.faviconUrl && isValidFavicon(input.faviconUrl) ? input.faviconUrl : null;
  return { url: url!.href, normalizedUrl, title, descriptionMd, tags, faviconUrl };
}

function replaceBookmarkTags(bookmarkId: number, names: string[]) {
  run("DELETE FROM bookmark_taggings WHERE bookmark_id = ?", bookmarkId);
  for (const name of names) run("INSERT OR IGNORE INTO bookmark_taggings (bookmark_id, tag_id) VALUES (?, ?)", bookmarkId, ensureTag(name));
  deleteUnusedTags();
}

export function createBookmark(input: BookmarkInput): number {
  const data = validate(input);
  return transaction(() => {
    const timestamp = now();
    const id = run(
      `INSERT INTO bookmarks (title, title_key, url, normalized_url, description_md, favicon_url, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      data.title,
      keyOf(data.title),
      data.url,
      data.normalizedUrl,
      data.descriptionMd,
      data.faviconUrl,
      input.userId,
      input.userId,
      timestamp,
      timestamp,
    ).lastInsertRowid;
    replaceBookmarkTags(id, data.tags);
    return id;
  });
}

export function updateBookmark(id: number, input: BookmarkInput) {
  if (!get("SELECT 1 FROM bookmarks WHERE id = ?", id)) throw new NotFoundError("bookmark not found");
  const data = validate(input, id);
  transaction(() => {
    run(
      `UPDATE bookmarks SET title = ?, title_key = ?, url = ?, normalized_url = ?, description_md = ?, favicon_url = ?, updated_by = ?, updated_at = ?
       WHERE id = ?`,
      data.title,
      keyOf(data.title),
      data.url,
      data.normalizedUrl,
      data.descriptionMd,
      data.faviconUrl,
      input.userId,
      now(),
      id,
    );
    replaceBookmarkTags(id, data.tags);
  });
}

/** 削除する（Wiki の他のデータと同じく、行ごと削除する） */
export function deleteBookmark(id: number) {
  if (!get("SELECT 1 FROM bookmarks WHERE id = ?", id)) throw new NotFoundError("bookmark not found");
  transaction(() => {
    run("DELETE FROM bookmarks WHERE id = ?", id);
    deleteUnusedTags();
  });
}
