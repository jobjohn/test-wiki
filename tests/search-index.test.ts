import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { MIGRATION_BACKFILLS, MIGRATIONS } from "@/lib/migrations";
import { backlinksFor, createPage, deletePage, findPageByTitle, getPage, searchPages, updatePage, type PageInput } from "@/lib/pages";
import { restoreTrashItem, trashPage, listTrash } from "@/lib/trash";

const input = (overrides: Partial<PageInput> = {}): PageInput => ({
  title: "無題",
  body: "",
  folderId: null,
  position: 0,
  tags: "",
  userId: null,
  ...overrides,
});
const titles = (query: string) => searchPages(query, 50, 0).pages.map((p) => p.title);

describe("全文検索（FTS5 trigram）", () => {
  it("日本語の部分一致・短い語・複数語の AND で探せる", () => {
    getDb();
    createPage(input({ title: "全文検索の設計", body: "SQLite の全文検索インデックスを使う。鰻丼" }));
    createPage(input({ title: "議事録", body: "来週の打ち合わせで鰻丼の話をする" }));

    expect(titles("文検索イン")).toEqual(["全文検索の設計"]);
    // 3 文字未満の語は LIKE で探す
    expect(titles("鰻丼").sort()).toEqual(["全文検索の設計", "議事録"].sort());
    expect(titles("鰻丼 打ち合わせ")).toEqual(["議事録"]);
    expect(titles("鰻丼 全文検索")).toEqual(["全文検索の設計"]);
    expect(titles("sqlite")).toEqual(["全文検索の設計"]);
    expect(titles("存在しない語句です")).toEqual([]);
    // FTS5 の構文として解釈される文字が入っていてもエラーにならない
    expect(() => titles('"AND" OR (*) NEAR')).not.toThrow();
  });

  it("保存・改名・削除に索引が追従する", () => {
    const id = createPage(input({ title: "追従テスト", body: "はじめの本文あいうえお" }));
    expect(titles("あいうえお")).toContain("追従テスト");

    updatePage(id, input({ title: "追従テスト改", body: "書き換えたかきくけこ" }), getPage(id)!.lockVersion);
    expect(titles("あいうえお")).not.toContain("追従テスト");
    expect(titles("かきくけこ")).toEqual(["追従テスト改"]);
    expect(titles("テスト改")).toEqual(["追従テスト改"]);

    deletePage(id);
    expect(titles("かきくけこ")).toEqual([]);
  });

  it("ゴミ箱に移すと見つからず、復元すると再び見つかる", () => {
    const id = createPage(input({ title: "ゴミ箱検索", body: "さしすせそ本文" }));
    trashPage(id, null);
    expect(titles("さしすせそ")).toEqual([]);
    const item = listTrash({ kind: "page", limit: 10, offset: 0 }).items.find((i) => i.itemId === id)!;
    restoreTrashItem(item.id);
    expect(titles("さしすせそ")).toEqual(["ゴミ箱検索"]);
  });
});

describe("バックリンク（page_links）", () => {
  it("保存・改名・削除・ゴミ箱・復元に追従する", () => {
    const target = createPage(input({ title: "リンク先ページ" }));
    const source = createPage(input({ title: "リンク元ページ", body: "[[リンク先ページ]] と `[[コード内]]`" }));
    const backlinks = () => backlinksFor(getPage(target)!).map((p) => p.title);
    expect(backlinks()).toEqual(["リンク元ページ"]);

    // リンク元の本文からリンクを消すと外れる
    updatePage(source, input({ title: "リンク元ページ", body: "リンクなし" }), getPage(source)!.lockVersion);
    expect(backlinks()).toEqual([]);
    updatePage(source, input({ title: "リンク元ページ", body: "[[りんく先ページ]]" }), getPage(source)!.lockVersion);
    expect(backlinks()).toEqual([]);
    updatePage(source, input({ title: "リンク元ページ", body: "[[ リンク先ページ |別名]]" }), getPage(source)!.lockVersion);
    expect(backlinks()).toEqual(["リンク元ページ"]);

    // リンク先を改名すると、古い名前へのリンクは数えない。同じ名前のページを作り直すとまた数える
    updatePage(target, input({ title: "新しい名前" }), getPage(target)!.lockVersion);
    expect(backlinks()).toEqual([]);
    const recreated = createPage(input({ title: "リンク先ページ" }));
    expect(backlinksFor(getPage(recreated)!).map((p) => p.title)).toEqual(["リンク元ページ"]);

    // リンク元をゴミ箱に移すと外れ、復元すると戻る
    trashPage(source, null);
    expect(backlinksFor(getPage(recreated)!)).toEqual([]);
    const item = listTrash({ kind: "page", limit: 10, offset: 0 }).items.find((i) => i.itemId === source)!;
    restoreTrashItem(item.id);
    expect(backlinksFor(getPage(recreated)!).map((p) => p.title)).toEqual(["リンク元ページ"]);

    deletePage(source);
    expect(backlinksFor(getPage(recreated)!)).toEqual([]);
  });

  it("初期データのページ間リンクも索引に入っている", () => {
    const home = findPageByTitle("ホーム")!;
    const guide = findPageByTitle("Markdown の書き方")!;
    expect(backlinksFor(guide).map((p) => p.id)).toEqual([home.id]);
  });
});

describe("検索・リンクの索引のマイグレーション", () => {
  it("既存のページを全文検索とバックリンクの索引に取り込む", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    const index = MIGRATIONS.findIndex((sql) => sql.includes("CREATE TABLE page_links"));
    // 新しいマイグレーションが後ろに足されても成り立つよう、「リンクの変更履歴より後」だけを確かめる
    expect(index).toBeGreaterThan(MIGRATIONS.findIndex((sql) => sql.includes("CREATE TABLE bookmark_revisions")));
    for (const sql of MIGRATIONS.slice(0, index)) db.exec(sql);
    const insert = db.prepare("INSERT INTO pages (title, title_key, body, created_at, updated_at) VALUES (?, ?, ?, 't', 't')");
    insert.run("移行前のページ", "移行前のページ", "古い本文たちつてと [[別のページ]]");
    insert.run("別のページ", "別のページ", "");

    db.exec(MIGRATIONS[index]);
    MIGRATION_BACKFILLS[index](db);

    expect(db.prepare("SELECT rowid FROM pages_fts WHERE pages_fts MATCH ?").all('"たちつてと"')).toHaveLength(1);
    expect(db.prepare("SELECT source_id, target_key FROM page_links").all().map((r) => ({ ...r }))).toEqual([
      { source_id: 1, target_key: "別のページ" },
    ]);
  });
});
