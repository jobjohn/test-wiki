import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createBookmark, findBookmarkByUrl, getBookmark } from "@/lib/bookmarks";
import { all, get, run } from "@/lib/db";
import { dataDir } from "@/lib/env";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createFolder } from "@/lib/folders";
import {
  backlinksFor,
  createPage,
  findPageByTitle,
  findTagByName,
  getPage,
  listPageOutlines,
  listRevisions,
  pageIdsByTitle,
  recentRevisions,
  searchPages,
  tagList,
  updatePage,
  type PageInput,
} from "@/lib/pages";
import {
  emptyTrash,
  listTrash,
  purgeExpiredTrash,
  purgeTrashItem,
  restoreTrashItem,
  TRASH_RETENTION_DAYS,
  trashBookmark,
  trashPage,
  trashUpload,
} from "@/lib/trash";
import { trashDaysLeft } from "@/lib/trash-utils";
import { getUpload, storeUpload } from "@/lib/uploads";
import { createUser, deleteUser } from "@/lib/users";

const input = (overrides: Partial<PageInput> = {}): PageInput => ({ title: "無題", body: "", folderId: null, position: 0, tags: "", userId: null, ...overrides });
const bookmarkInput = (overrides: Partial<Parameters<typeof createBookmark>[0]> = {}) => ({
  url: "https://example.com/",
  title: "Example",
  descriptionMd: "",
  tags: "",
  faviconUrl: "",
  userId: null,
  ...overrides,
});
const trashIdOf = (kind: string, itemId: number) => get<{ id: number }>("SELECT id FROM trash_items WHERE kind = ? AND item_id = ?", kind, itemId)!.id;
const trashCount = () => get<{ n: number }>("SELECT COUNT(*) AS n FROM trash_items")!.n;
const DAY = 24 * 60 * 60 * 1000;

describe("ページのゴミ箱", () => {
  it("退避すると、取得・検索・サイドバー・履歴・被リンクに出なくなる", () => {
    const target = createPage(input({ title: "退避ページ", body: "退避用のユニークな本文qwerty" }));
    // 退避するページ自身が [[リンク]] しているページの被リンクからも消える
    const linked = createPage(input({ title: "リンク先ページ" }));
    run("UPDATE pages SET body = '[[リンク先ページ]] を参照' WHERE id = ?", target);
    expect(backlinksFor(getPage(linked)!).map((b) => b.id)).toEqual([target]);

    trashPage(target, null);

    expect(getPage(target)).toBeUndefined();
    expect(findPageByTitle("退避ページ")).toBeUndefined();
    expect(pageIdsByTitle(["退避ページ"]).size).toBe(0);
    expect(searchPages("qwerty", 10, 0).total).toBe(0);
    expect(listPageOutlines().some((p) => p.id === target)).toBe(false);
    expect(recentRevisions(100, 0).some((r) => r.pageId === target)).toBe(false);
    expect(backlinksFor(getPage(linked)!)).toEqual([]);
    expect(listTrash({ limit: 10, offset: 0 }).items.map((i) => i.itemId)).toContain(target);
  });

  it("存在しないページは退避できず、二重に退避されない", () => {
    expect(() => trashPage(999999, null)).toThrow(NotFoundError);
    const id = createPage(input({ title: "二重退避" }));
    trashPage(id, null);
    expect(() => trashPage(id, null)).toThrow(NotFoundError);
    expect(all("SELECT 1 FROM trash_items WHERE kind = 'page' AND item_id = ?", id)).toHaveLength(1);
    // 同じ (kind, item_id) は一意制約でも守られている
    expect(() => run("INSERT INTO trash_items (kind, item_id, title, payload, deleted_at) VALUES ('page', ?, 'x', '{}', 't')", id)).toThrow(/UNIQUE/);
  });

  it("復元すると id・版番号・履歴・タグ・フォルダ・lock_version が元どおりに戻る", () => {
    const user = createUser({ email: "trash-editor@example.com", displayName: "編集者", role: "general", password: "password123" });
    const folder = createFolder({ name: "復元フォルダ", parentId: null, position: 0 });
    const id = createPage(input({ title: "復元ページ", body: "v1", folderId: folder, position: 7, tags: "復元タグ, 別タグ", userId: user, summary: "初版" }));
    updatePage(id, input({ title: "復元ページ", body: "v2", folderId: folder, position: 7, tags: "復元タグ, 別タグ", userId: user, summary: "二版目" }), 0);
    const before = getPage(id)!;
    const revisionsBefore = listRevisions(id);
    expect(before.lockVersion).toBe(1);

    trashPage(id, user);
    // 退避で未使用になったタグは掃除されている
    expect(findTagByName("復元タグ")).toBeUndefined();

    const restored = restoreTrashItem(trashIdOf("page", id));
    expect(restored).toMatchObject({ kind: "page", itemId: id, href: `/pages/${id}` });
    expect(getPage(id)).toEqual(before);
    // 履歴の行 ID は振り直されるが、版番号（URL に使う値）と内容は同じ
    const withoutId = (list: ReturnType<typeof listRevisions>) => list.map(({ id: _id, ...rest }) => rest);
    expect(withoutId(listRevisions(id))).toEqual(withoutId(revisionsBefore));
    expect(listRevisions(id).map((r) => [r.number, r.summary, r.userId])).toEqual([
      [2, "二版目", user],
      [1, "初版", user],
    ]);
    expect(tagList(id).split(", ").sort()).toEqual(["別タグ", "復元タグ"].sort());
    expect(findTagByName("復元タグ")).toBeDefined();
    expect(get("SELECT 1 FROM trash_items WHERE kind = 'page' AND item_id = ?", id)).toBeUndefined();
    // 復元後も、通常どおり更新できる（版番号が続く）
    updatePage(id, input({ title: "復元ページ", body: "v3", folderId: folder, position: 7, tags: "復元タグ", userId: user }), 1);
    expect(listRevisions(id)[0].number).toBe(3);
  });

  it("フォルダが消えていればルートに戻す。履歴のユーザーが消えていれば NULL", () => {
    const folder = createFolder({ name: "消えるフォルダ", parentId: null, position: 0 });
    const user = createUser({ email: "trash-gone@example.com", role: "general", password: "password123" });
    const id = createPage(input({ title: "フォルダ喪失ページ", folderId: folder, userId: user }));
    trashPage(id, null);
    run("DELETE FROM folders WHERE id = ?", folder);
    deleteUser(user);

    restoreTrashItem(trashIdOf("page", id));
    expect(getPage(id)!.folderId).toBeNull();
    expect(listRevisions(id)[0].userId).toBeNull();
  });

  it("同じタイトルのページが既にあると復元を断り、ゴミ箱に残す", () => {
    const id = createPage(input({ title: "衝突ページ" }));
    trashPage(id, null);
    // 退避中に同じタイトルのページが作られた状態
    const other = createPage(input({ title: "衝突ページ" }));

    expect(() => restoreTrashItem(trashIdOf("page", id))).toThrow(ValidationError);
    expect(getPage(id)).toBeUndefined();
    expect(get("SELECT 1 FROM trash_items WHERE kind = 'page' AND item_id = ?", id)).toBeDefined();
    // 衝突が解消すれば復元できる
    trashPage(other, null);
    expect(() => restoreTrashItem(trashIdOf("page", id))).not.toThrow();
    expect(getPage(id)!.title).toBe("衝突ページ");
  });

  it("退避データが壊れていれば、ValidationError で復元を断る", () => {
    const id = createPage(input({ title: "壊れたデータ" }));
    trashPage(id, null);
    run("UPDATE trash_items SET payload = '{broken' WHERE kind = 'page' AND item_id = ?", id);
    expect(() => restoreTrashItem(trashIdOf("page", id))).toThrow(/壊れている/);
    purgeTrashItem(trashIdOf("page", id));
  });

  it("復元の途中で失敗しても、中途半端に戻らない", () => {
    const id = createPage(input({ title: "ロールバック確認", tags: "rb" }));
    trashPage(id, null);
    // 元の id が使われてしまった状態にして、INSERT を失敗させる
    run("INSERT INTO pages (id, title, title_key, created_at, updated_at) VALUES (?, 'x-占有', 'x-占有', 't', 't')", id);
    expect(() => restoreTrashItem(trashIdOf("page", id))).toThrow();
    expect(get("SELECT 1 FROM trash_items WHERE kind = 'page' AND item_id = ?", id)).toBeDefined();
    expect(findTagByName("rb")).toBeUndefined();
    run("DELETE FROM pages WHERE id = ?", id);
  });
});

describe("リンクのゴミ箱", () => {
  it("退避と復元で、登録者・更新者・favicon・説明・タグが戻る", () => {
    const author = createUser({ email: "trash-author@example.com", displayName: "登録者", role: "general", password: "password123" });
    const favicon = "data:image/png;base64,iVBORw0KGgo=";
    const id = createBookmark(bookmarkInput({ url: "https://trash-bm.example.com/a", title: "退避リンク", descriptionMd: "説明です", tags: "リンクタグ", faviconUrl: favicon, userId: author }));
    const before = getBookmark(id)!;

    trashBookmark(id, author);
    expect(getBookmark(id)).toBeUndefined();
    expect(findBookmarkByUrl("https://trash-bm.example.com/a")).toBeUndefined();
    expect(findTagByName("リンクタグ")).toBeUndefined();
    expect(listTrash({ kind: "bookmark", limit: 10, offset: 0 }).items[0]).toMatchObject({ kind: "bookmark", itemId: id, title: "退避リンク", deletedByName: "登録者" });

    expect(restoreTrashItem(trashIdOf("bookmark", id)).href).toBe(`/bookmarks/${id}`);
    // タグは作り直されるため、ID は変わりうる
    const names = (b: NonNullable<ReturnType<typeof getBookmark>>) => ({ ...b, tags: b.tags.map((t) => t.name) });
    expect(names(getBookmark(id)!)).toEqual(names(before));
    expect(getBookmark(id)).toMatchObject({ createdBy: author, updatedBy: author, descriptionMd: "説明です", tags: [expect.objectContaining({ name: "リンクタグ" })] });
  });

  it("登録者のユーザーが削除済みなら NULL で復元する", () => {
    const temp = createUser({ email: "trash-bm-temp@example.com", role: "general", password: "password123" });
    const id = createBookmark(bookmarkInput({ url: "https://trash-orphan.example.com", userId: temp }));
    trashBookmark(id, null);
    deleteUser(temp);
    restoreTrashItem(trashIdOf("bookmark", id));
    expect(getBookmark(id)).toMatchObject({ createdBy: null, updatedBy: null });
  });

  it("同じ URL（正規化後）のリンクが既にあると復元を断る", () => {
    const id = createBookmark(bookmarkInput({ url: "https://trash-dup.example.com/x", title: "元のリンク" }));
    trashBookmark(id, null);
    createBookmark(bookmarkInput({ url: "https://TRASH-DUP.example.com/x/#top", title: "後から登録" }));
    expect(() => restoreTrashItem(trashIdOf("bookmark", id))).toThrow(/後から登録/);
    expect(getBookmark(id)).toBeUndefined();
  });
});

describe("ファイルのゴミ箱", () => {
  const fileOnDisk = (key: string) => path.join(dataDir(), "files", key);

  it("退避すると取得できず、復元で戻る。実ファイルは退避中も残る", async () => {
    const upload = await storeUpload(new File(["中身"], "trash.txt", { type: "text/plain" }), null);
    trashUpload(upload.id, null);
    expect(getUpload(upload.id)).toBeUndefined();
    expect(fs.existsSync(fileOnDisk(upload.storageKey))).toBe(true);

    expect(restoreTrashItem(trashIdOf("upload", upload.id)).href).toBe("/uploads");
    expect(getUpload(upload.id)).toEqual(upload);
    expect(fs.readFileSync(fileOnDisk(upload.storageKey), "utf8")).toBe("中身");
  });

  it("完全削除で実ファイルも消える", async () => {
    const upload = await storeUpload(new File(["x"], "purge.txt", { type: "text/plain" }), null);
    trashUpload(upload.id, null);
    purgeTrashItem(trashIdOf("upload", upload.id));
    expect(fs.existsSync(fileOnDisk(upload.storageKey))).toBe(false);
    expect(getUpload(upload.id)).toBeUndefined();
    expect(() => purgeTrashItem(999999)).toThrow(NotFoundError);
  });
});

describe("期限切れ・完全削除・空にする", () => {
  it("30 日を過ぎたものだけを完全に削除する（実ファイルも）", async () => {
    const oldPage = createPage(input({ title: "期限切れページ" }));
    const freshPage = createPage(input({ title: "期限内ページ" }));
    const edgePage = createPage(input({ title: "ちょうど 30 日のページ" }));
    const upload = await storeUpload(new File(["old"], "old.txt", { type: "text/plain" }), null);
    for (const id of [oldPage, freshPage, edgePage]) trashPage(id, null);
    trashUpload(upload.id, null);

    const base = Date.now();
    const setDeletedAt = (kind: string, itemId: number, at: number) =>
      run("UPDATE trash_items SET deleted_at = ? WHERE kind = ? AND item_id = ?", new Date(at).toISOString(), kind, itemId);
    setDeletedAt("page", oldPage, base - (TRASH_RETENTION_DAYS + 1) * DAY);
    setDeletedAt("upload", upload.id, base - (TRASH_RETENTION_DAYS + 5) * DAY);
    setDeletedAt("page", edgePage, base - TRASH_RETENTION_DAYS * DAY + 1000);
    setDeletedAt("page", freshPage, base - 1 * DAY);

    expect(purgeExpiredTrash(new Date(base))).toBe(2);
    const left = (kind: string, id: number) => get("SELECT 1 FROM trash_items WHERE kind = ? AND item_id = ?", kind, id) !== undefined;
    expect(left("page", oldPage)).toBe(false);
    expect(left("upload", upload.id)).toBe(false);
    expect(left("page", edgePage)).toBe(true);
    expect(left("page", freshPage)).toBe(true);
    expect(fs.existsSync(path.join(dataDir(), "files", upload.storageKey))).toBe(false);
  });

  it("now を省いた呼び出しは、1 時間に 1 回までに抑える", () => {
    const id = createPage(input({ title: "間引きページ" }));
    trashPage(id, null);
    run("UPDATE trash_items SET deleted_at = ? WHERE kind = 'page' AND item_id = ?", new Date(Date.now() - 40 * DAY).toISOString(), id);
    purgeExpiredTrash(); // 1 回目は実行される
    expect(get("SELECT 1 FROM trash_items WHERE kind = 'page' AND item_id = ?", id)).toBeUndefined();

    const again = createPage(input({ title: "間引きページ 2" }));
    trashPage(again, null);
    run("UPDATE trash_items SET deleted_at = ? WHERE kind = 'page' AND item_id = ?", new Date(Date.now() - 40 * DAY).toISOString(), again);
    expect(purgeExpiredTrash()).toBe(0); // 直後の 2 回目は何もしない
    expect(get("SELECT 1 FROM trash_items WHERE kind = 'page' AND item_id = ?", again)).toBeDefined();
  });

  it("1 件を完全に削除すると復元できない。ゴミ箱を空にすると全件が消える", async () => {
    const a = createPage(input({ title: "完全削除ページ" }));
    const b = createPage(input({ title: "空にするページ" }));
    const upload = await storeUpload(new File(["e"], "empty.txt", { type: "text/plain" }), null);
    trashPage(a, null);
    trashPage(b, null);
    trashUpload(upload.id, null);

    const trashA = trashIdOf("page", a);
    purgeTrashItem(trashA);
    expect(() => restoreTrashItem(trashA)).toThrow(NotFoundError);

    const remaining = trashCount();
    expect(emptyTrash()).toBe(remaining);
    expect(trashCount()).toBe(0);
    expect(fs.existsSync(path.join(dataDir(), "files", upload.storageKey))).toBe(false);
    expect(listTrash({ limit: 10, offset: 0 })).toEqual({ items: [], total: 0 });
  });
});

describe("一覧", () => {
  it("種類での絞り込み・ページ送りができ、普通のオブジェクトを返す", () => {
    emptyTrash();
    const ids = [1, 2, 3].map((n) => createPage(input({ title: `一覧ページ${n}` })));
    for (const id of ids) trashPage(id, null);
    const bm = createBookmark(bookmarkInput({ url: "https://list.example.com", title: "一覧リンク" }));
    trashBookmark(bm, null);

    expect(listTrash({ limit: 10, offset: 0 }).total).toBe(4);
    const pages = listTrash({ kind: "page", limit: 2, offset: 0 });
    expect(pages.total).toBe(3);
    expect(pages.items).toHaveLength(2);
    expect(listTrash({ kind: "page", limit: 2, offset: 2 }).items).toHaveLength(1);
    expect(listTrash({ kind: "bookmark", limit: 10, offset: 0 }).items.map((i) => i.title)).toEqual(["一覧リンク"]);
    const item = pages.items[0];
    expect(Object.getPrototypeOf(item)).toBe(Object.prototype);
    expect(Object.keys(item).sort()).toEqual(["deletedAt", "deletedByName", "id", "itemId", "kind", "title"]);
  });

  it("残り日数は切り上げで、0 未満にならない", () => {
    const deletedAt = new Date(Date.UTC(2026, 0, 1)).toISOString();
    expect(trashDaysLeft(deletedAt, new Date(Date.UTC(2026, 0, 1)))).toBe(30);
    expect(trashDaysLeft(deletedAt, new Date(Date.UTC(2026, 0, 1, 12)))).toBe(30);
    expect(trashDaysLeft(deletedAt, new Date(Date.UTC(2026, 0, 30, 1)))).toBe(1);
    expect(trashDaysLeft(deletedAt, new Date(Date.UTC(2026, 3, 1)))).toBe(0);
  });
});
