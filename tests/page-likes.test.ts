import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { getDb, run } from "@/lib/db";
import { MIGRATIONS } from "@/lib/migrations";
import { likeCount, pageLikes, setPageLike } from "@/lib/page-likes";
import { createPage, deletePage, type PageInput } from "@/lib/pages";
import { listTrash, restoreTrashItem, trashPage } from "@/lib/trash";
import { createUser, deleteUser } from "@/lib/users";

const input = (title: string): PageInput => ({ title, body: "", folderId: null, position: 0, tags: "", userId: null });
const user = (email: string) => createUser({ email, role: "general", password: "password123" });

describe("ページのいいね!", () => {
  it("ユーザーごとに 1 回だけ付けられ、外せる（同じ操作を繰り返しても数は変わらない）", () => {
    getDb();
    const pageId = createPage(input("いいねのテスト"));
    const alice = user("like-alice@example.com");
    const bob = user("like-bob@example.com");

    expect(pageLikes(pageId, alice)).toEqual({ count: 0, liked: false });
    expect(setPageLike(pageId, alice, true)).toEqual({ count: 1, liked: true });
    expect(setPageLike(pageId, alice, true)).toEqual({ count: 1, liked: true });
    expect(setPageLike(pageId, bob, true)).toEqual({ count: 2, liked: true });
    expect(pageLikes(pageId, alice)).toEqual({ count: 2, liked: true });
    // 未ログインの閲覧では数だけ
    expect(pageLikes(pageId, null)).toEqual({ count: 2, liked: false });

    expect(setPageLike(pageId, alice, false)).toEqual({ count: 1, liked: false });
    expect(setPageLike(pageId, alice, false)).toEqual({ count: 1, liked: false });
    expect(pageLikes(pageId, bob)).toEqual({ count: 1, liked: true });
  });

  it("同じページ・同じユーザーの行はデータベースでも重複できない", () => {
    const pageId = createPage(input("重複のテスト"));
    const carol = user("like-carol@example.com");
    setPageLike(pageId, carol, true);
    expect(() => run("INSERT INTO page_likes (page_id, user_id, created_at) VALUES (?, ?, ?)", pageId, carol, "2026-01-01")).toThrow();
  });

  it("存在しないページには付けられない", () => {
    const dave = user("like-dave@example.com");
    expect(() => setPageLike(999999, dave, true)).toThrow();
  });

  it("ページ・ユーザーを削除すると、そのいいね!も消える", () => {
    const pageId = createPage(input("削除のテスト"));
    const erin = user("like-erin@example.com");
    const frank = user("like-frank@example.com");
    setPageLike(pageId, erin, true);
    setPageLike(pageId, frank, true);

    deleteUser(frank);
    expect(likeCount(pageId)).toBe(1);

    deletePage(pageId);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM page_likes WHERE page_id = ?").get(pageId)).toEqual({ n: 0 });
  });

  it("ゴミ箱に移して復元すると、いいね!も戻る（退避中に削除されたユーザーの分は戻さない）", () => {
    const pageId = createPage(input("ゴミ箱のテスト"));
    const gina = user("like-gina@example.com");
    const hank = user("like-hank@example.com");
    setPageLike(pageId, gina, true);
    setPageLike(pageId, hank, true);

    trashPage(pageId, null);
    expect(likeCount(pageId)).toBe(0);
    deleteUser(hank);

    const item = listTrash({ kind: "page", limit: 100, offset: 0 }).items.find((t) => t.itemId === pageId)!;
    restoreTrashItem(item.id);
    expect(pageLikes(pageId, gina)).toEqual({ count: 1, liked: true });
    expect(pageLikes(pageId, hank).count).toBe(1);
  });

  it("既存のデータベースに page_likes を追加しても、既存の行は変わらない", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    const index = MIGRATIONS.findIndex((sql) => sql.includes("CREATE TABLE page_likes"));
    expect(index).toBeGreaterThan(MIGRATIONS.findIndex((sql) => sql.includes("CREATE TABLE page_links")));
    for (const sql of MIGRATIONS.slice(0, index)) db.exec(sql);
    const before = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
    db.exec(MIGRATIONS[index]);
    const after = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name != 'page_likes' AND name != 'sqlite_sequence' ORDER BY name").all();
    expect(after).toEqual(before.filter((t) => (t as { name: string }).name !== "sqlite_sequence"));
    expect(db.prepare("SELECT name FROM pragma_table_info('page_likes') ORDER BY cid").all().map((c) => (c as { name: string }).name)).toEqual([
      "id",
      "page_id",
      "user_id",
      "created_at",
    ]);
  });
});
