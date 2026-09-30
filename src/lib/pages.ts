import { all, get, run, transaction } from "./db";
import { NotFoundError, StaleError, ValidationError } from "./errors";
import { escapeLike, keyOf, normalizeBody, now, parseTagList, squish } from "./text";
import { extractWikiLinkTitles } from "./wikilinks";

export const TITLE_MAX_LENGTH = 200;

export interface Page {
  id: number;
  title: string;
  body: string;
  folderId: number | null;
  position: number;
  lockVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Revision {
  id: number;
  pageId: number;
  number: number;
  title: string;
  body: string;
  summary: string | null;
  createdAt: string;
  userId: number | null;
  userName: string | null;
}

interface PageRow {
  id: number;
  title: string;
  body: string;
  folder_id: number | null;
  position: number;
  lock_version: number;
  created_at: string;
  updated_at: string;
}

const mapPage = (row: PageRow): Page => ({
  id: row.id,
  title: row.title,
  body: row.body,
  folderId: row.folder_id,
  position: row.position,
  lockVersion: row.lock_version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const getPage = (id: number): Page | undefined => {
  const row = get<PageRow>("SELECT * FROM pages WHERE id = ?", id);
  return row && mapPage(row);
};

export const findPageByTitle = (title: string): Page | undefined => {
  const row = get<PageRow>("SELECT * FROM pages WHERE title_key = ?", keyOf(title));
  return row && mapPage(row);
};

export const countPages = (): number => get<{ n: number }>("SELECT COUNT(*) AS n FROM pages")!.n;

export const listRecentPages = (limit: number): Page[] =>
  all<PageRow>("SELECT * FROM pages ORDER BY updated_at DESC, id DESC LIMIT ?", limit).map(mapPage);

export const listPagesInFolder = (folderId: number | null): Page[] =>
  all<PageRow>(
    folderId === null
      ? "SELECT * FROM pages WHERE folder_id IS NULL ORDER BY position, title_key"
      : "SELECT * FROM pages WHERE folder_id = ? ORDER BY position, title_key",
    ...(folderId === null ? [] : [folderId]),
  ).map(mapPage);

/** サイドバー用: 全ページの (id, title, folderId) */
export const listPageOutlines = (): { id: number; title: string; folderId: number | null }[] =>
  all<{ id: number; title: string; folder_id: number | null }>(
    "SELECT id, title, folder_id FROM pages ORDER BY position, title_key",
  ).map((r) => ({ id: r.id, title: r.title, folderId: r.folder_id }));

/** タイトルキー → ページ ID（Wiki リンクの解決用） */
export function pageIdsByTitle(titles: string[]): Map<string, number> {
  const keys = [...new Set(titles.map(keyOf))];
  const map = new Map<string, number>();
  for (let i = 0; i < keys.length; i += 500) {
    const chunk = keys.slice(i, i + 500);
    const rows = all<{ id: number; title_key: string }>(
      `SELECT id, title_key FROM pages WHERE title_key IN (${chunk.map(() => "?").join(",")})`,
      ...chunk,
    );
    for (const row of rows) map.set(row.title_key, row.id);
  }
  return map;
}

// ---- タグ ----

export function tagsForPages(pageIds: number[]): Map<number, Tag[]> {
  const map = new Map<number, Tag[]>();
  if (!pageIds.length) return map;
  const rows = all<{ page_id: number; id: number; name: string }>(
    `SELECT tg.page_id, t.id, t.name FROM taggings tg JOIN tags t ON t.id = tg.tag_id
     WHERE tg.page_id IN (${pageIds.map(() => "?").join(",")}) ORDER BY t.name_key`,
    ...pageIds,
  );
  for (const row of rows) map.set(row.page_id, [...(map.get(row.page_id) ?? []), { id: row.id, name: row.name }]);
  return map;
}

export const tagsForPage = (pageId: number): Tag[] => tagsForPages([pageId]).get(pageId) ?? [];

export const tagList = (pageId: number): string => tagsForPage(pageId).map((t) => t.name).join(", ");

export const listTagNames = (): string[] => all<{ name: string }>("SELECT name FROM tags ORDER BY name_key").map((t) => t.name);

export const listTagsWithCounts = (): (Tag & { count: number })[] =>
  all<{ id: number; name: string; count: number }>(
    `SELECT t.id, t.name, COUNT(tg.page_id) AS count FROM tags t JOIN taggings tg ON tg.tag_id = t.id
     GROUP BY t.id ORDER BY t.name_key`,
  );

export const findTagByName = (name: string): Tag | undefined => get<Tag>("SELECT id, name FROM tags WHERE name_key = ?", keyOf(name));

export const pagesForTag = (tagId: number): Page[] =>
  all<PageRow>(
    "SELECT p.* FROM pages p JOIN taggings tg ON tg.page_id = p.id WHERE tg.tag_id = ? ORDER BY p.title_key",
    tagId,
  ).map(mapPage);

function replaceTags(pageId: number, names: string[]) {
  run("DELETE FROM taggings WHERE page_id = ?", pageId);
  for (const name of names) {
    run("INSERT INTO tags (name, name_key) VALUES (?, ?) ON CONFLICT(name_key) DO NOTHING", name, keyOf(name));
    const tag = get<{ id: number }>("SELECT id FROM tags WHERE name_key = ?", keyOf(name))!;
    run("INSERT OR IGNORE INTO taggings (page_id, tag_id) VALUES (?, ?)", pageId, tag.id);
  }
  run("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM taggings)");
}

// ---- 作成・更新・削除 ----

export interface PageInput {
  title: string;
  body: string;
  folderId: number | null;
  position: number;
  tags: string;
  summary?: string;
  userId: number | null;
}

function validate(input: PageInput, id?: number) {
  const errors: string[] = [];
  const title = squish(input.title);
  if (!title) errors.push("タイトルを入力してください");
  if (title.length > TITLE_MAX_LENGTH) errors.push(`タイトルは ${TITLE_MAX_LENGTH} 文字以内にしてください`);
  if (title) {
    const clash = get<{ id: number }>("SELECT id FROM pages WHERE title_key = ?", keyOf(title));
    if (clash && clash.id !== id) errors.push("同じタイトルのページが既にあります");
  }
  if (input.folderId !== null && !get("SELECT 1 FROM folders WHERE id = ?", input.folderId)) errors.push("フォルダが存在しません");
  if (!Number.isInteger(input.position)) errors.push("表示順は整数で指定してください");
  if (errors.length) throw new ValidationError(errors);
  return title;
}

function recordRevision(pageId: number, title: string, body: string, summary: string | undefined, userId: number | null) {
  const next = (get<{ n: number | null }>("SELECT MAX(number) AS n FROM revisions WHERE page_id = ?", pageId)!.n ?? 0) + 1;
  run(
    "INSERT INTO revisions (page_id, user_id, number, title, body, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    pageId,
    userId,
    next,
    title,
    body,
    summary?.trim() ? summary.trim().slice(0, 200) : null,
    now(),
  );
}

export function createPage(data: PageInput): number {
  const title = validate(data);
  const body = normalizeBody(data.body);
  return transaction(() => {
    const timestamp = now();
    const id = run(
      "INSERT INTO pages (title, title_key, body, folder_id, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      title,
      keyOf(title),
      body,
      data.folderId,
      data.position,
      timestamp,
      timestamp,
    ).lastInsertRowid;
    recordRevision(id, title, body, data.summary || "作成", data.userId);
    replaceTags(id, parseTagList(data.tags));
    return id;
  });
}

/** 更新する。lockVersion が最新でなければ StaleError（他の人が先に保存している） */
export function updatePage(id: number, data: PageInput, lockVersion: number) {
  const current = getPage(id);
  if (!current) throw new NotFoundError("page not found");
  const title = validate(data, id);
  const body = normalizeBody(data.body);

  transaction(() => {
    const result = run(
      `UPDATE pages SET title = ?, title_key = ?, body = ?, folder_id = ?, position = ?, lock_version = lock_version + 1, updated_at = ?
       WHERE id = ? AND lock_version = ?`,
      title,
      keyOf(title),
      body,
      data.folderId,
      data.position,
      now(),
      id,
      lockVersion,
    );
    if (result.changes === 0) throw new StaleError();
    if (title !== current.title || body !== current.body) recordRevision(id, title, body, data.summary, data.userId);
    replaceTags(id, parseTagList(data.tags));
  });
}

export function deletePage(id: number) {
  run("DELETE FROM pages WHERE id = ?", id);
  run("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM taggings)");
}

// ---- 履歴 ----

interface RevisionRow {
  id: number;
  page_id: number;
  number: number;
  title: string;
  body: string;
  summary: string | null;
  created_at: string;
  user_id: number | null;
  user_name: string | null;
}

const REVISION_SELECT = `SELECT r.*, COALESCE(u.display_name, u.username) AS user_name FROM revisions r LEFT JOIN users u ON u.id = r.user_id`;

const mapRevision = (row: RevisionRow): Revision => ({
  id: row.id,
  pageId: row.page_id,
  number: row.number,
  title: row.title,
  body: row.body,
  summary: row.summary,
  createdAt: row.created_at,
  userId: row.user_id,
  userName: row.user_name,
});

export const listRevisions = (pageId: number): Revision[] =>
  all<RevisionRow>(`${REVISION_SELECT} WHERE r.page_id = ? ORDER BY r.number DESC`, pageId).map(mapRevision);

export const getRevision = (pageId: number, number: number): Revision | undefined => {
  const row = get<RevisionRow>(`${REVISION_SELECT} WHERE r.page_id = ? AND r.number = ?`, pageId, number);
  return row && mapRevision(row);
};

export const latestRevision = (pageId: number): Revision | undefined => {
  const row = get<RevisionRow>(`${REVISION_SELECT} WHERE r.page_id = ? ORDER BY r.number DESC LIMIT 1`, pageId);
  return row && mapRevision(row);
};

export const recentRevisions = (limit: number, offset: number): (Revision & { pageTitle: string })[] =>
  all<RevisionRow & { page_title: string }>(
    `SELECT r.*, COALESCE(u.display_name, u.username) AS user_name, p.title AS page_title
     FROM revisions r JOIN pages p ON p.id = r.page_id LEFT JOIN users u ON u.id = r.user_id
     ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    limit,
    offset,
  ).map((row) => ({ ...mapRevision(row), pageTitle: row.page_title }));

/** 過去の版の内容に戻す（新しい版として保存される） */
export function restoreRevision(pageId: number, number: number, userId: number | null) {
  const page = getPage(pageId);
  const revision = getRevision(pageId, number);
  if (!page || !revision) throw new NotFoundError("revision not found");
  updatePage(
    pageId,
    {
      title: revision.title,
      body: revision.body,
      folderId: page.folderId,
      position: page.position,
      tags: tagList(pageId),
      summary: `第${revision.number}版に復元`,
      userId,
    },
    page.lockVersion,
  );
}

// ---- 検索・リンク ----

function searchClause(query: string): { where: string; params: string[] } {
  const terms = query.split(/[\s　]+/).filter(Boolean).slice(0, 10);
  const where = terms.map(() => "(p.title LIKE ? ESCAPE '\\' OR p.body LIKE ? ESCAPE '\\')").join(" AND ");
  const params = terms.flatMap((t) => [`%${escapeLike(t)}%`, `%${escapeLike(t)}%`]);
  return { where: where || "0", params };
}

/** 空白区切りの全キーワードを含むページ（タイトル一致を先頭に） */
export function searchPages(query: string, limit: number, offset: number): { pages: Page[]; total: number } {
  const { where, params } = searchClause(query);
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM pages p WHERE ${where}`, ...params)!.n;
  const rows = all<PageRow>(
    `SELECT p.* FROM pages p WHERE ${where}
     ORDER BY CASE WHEN p.title LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END, p.updated_at DESC LIMIT ? OFFSET ?`,
    ...params,
    `%${escapeLike(query.trim())}%`,
    limit,
    offset,
  );
  return { pages: rows.map(mapPage), total };
}

/** このページへ [[リンク]] しているページ */
export function backlinksFor(page: Page): { id: number; title: string }[] {
  const candidates = all<{ id: number; title: string; body: string }>(
    "SELECT id, title, body FROM pages WHERE id != ? AND body LIKE ? ESCAPE '\\'",
    page.id,
    `%[[${escapeLike(page.title)}%`,
  );
  const key = keyOf(page.title);
  return candidates
    .filter((c) => extractWikiLinkTitles(c.body).some((t) => keyOf(t) === key))
    .map(({ id, title }) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title, "ja"));
}
