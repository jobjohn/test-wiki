import { describe, expect, it } from "vitest";
import { displayDomain, isValidFavicon, normalizeUrl, parseHttpUrl, plainExcerpt } from "@/lib/bookmark-utils";
import {
  type BookmarkInput,
  createBookmark,
  deleteBookmark,
  findBookmarkByUrl,
  getBookmark,
  listBookmarks,
  listBookmarkRevisions,
  listBookmarkTags,
  restoreBookmarkRevision,
  updateBookmark,
} from "@/lib/bookmarks";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createPage, deletePage, findTagByName, listTagNames, tagList, updatePage } from "@/lib/pages";
import { createUser, deleteUser } from "@/lib/users";

const input = (overrides: Partial<BookmarkInput> = {}): BookmarkInput => ({
  url: "https://example.com/",
  title: "Example",
  descriptionMd: "",
  tags: "",
  faviconUrl: "",
  userId: null,
  ...overrides,
});

const normalized = (url: string) => normalizeUrl(parseHttpUrl(url)!);

describe("URL の検証・正規化", () => {
  it("http / https だけを受け付ける", () => {
    expect(parseHttpUrl("https://example.com")).not.toBeNull();
    expect(parseHttpUrl("  http://example.com/a  ")).not.toBeNull();
    for (const bad of ["javascript:alert(1)", "ftp://example.com", "example.com", "https://", "https://user:pw@example.com", "https://exa mple.com", ""]) {
      expect(parseHttpUrl(bad), bad).toBeNull();
    }
  });

  it("大文字小文字・末尾のスラッシュ・# 以降・計測用クエリ・クエリの順番の違いを同じ URL とみなす", () => {
    const base = normalized("https://example.com/docs?a=1&b=2");
    expect(normalized("HTTPS://Example.COM:443/docs/?b=2&a=1#section")).toBe(base);
    expect(normalized("https://example.com/docs?a=1&utm_source=x&b=2&fbclid=y")).toBe(base);
    expect(normalized("https://example.com")).toBe(normalized("https://example.com/"));
  });

  it("http と https、www の有無、パスの大文字小文字は別の URL", () => {
    const base = normalized("https://example.com/Docs");
    expect(normalized("http://example.com/Docs")).not.toBe(base);
    expect(normalized("https://www.example.com/Docs")).not.toBe(base);
    expect(normalized("https://example.com/docs")).not.toBe(base);
  });

  it("表示用のドメインは www. を省く", () => {
    expect(displayDomain("https://www.github.com/foo")).toBe("github.com");
    expect(displayDomain("https://nextjs.org/docs")).toBe("nextjs.org");
  });

  it("ファビコンはラスター画像の data: URI だけ受け付ける", () => {
    expect(isValidFavicon("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isValidFavicon("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isValidFavicon("https://example.com/favicon.ico")).toBe(false);
    expect(isValidFavicon("data:image/png;base64,<script>")).toBe(false);
  });

  it("説明文の抜粋は Markdown の記号を除いたプレーンテキスト", () => {
    expect(plainExcerpt("## 見出し\n\n**太字** と [リンク](https://example.com) と `code`\n- 項目")).toBe("見出し 太字 と リンク と code 項目");
    expect(plainExcerpt("<script>alert(1)</script><b>本文</b>")).toBe("本文");
    expect(plainExcerpt("あ".repeat(200), 10)).toBe(`${"あ".repeat(10)}…`);
  });
});

describe("リンクの登録・更新・削除", () => {
  const author = createUser({ email: "link-author@example.com", displayName: "山田太郎", role: "general", password: "password123" });
  const editor = createUser({ email: "link-editor@example.com", displayName: "佐藤花子", role: "general", password: "password123" });

  it("登録者・更新者・日時を記録する", () => {
    const id = createBookmark(input({ url: "https://github.com", title: " GitHub ", descriptionMd: "ソース管理\r\n", tags: "開発, ツール", userId: author }));
    const created = getBookmark(id)!;
    expect(created).toMatchObject({
      title: "GitHub",
      url: "https://github.com/",
      descriptionMd: "ソース管理",
      createdBy: author,
      createdByName: "山田太郎",
      updatedBy: author,
    });
    expect(created.tags.map((t) => t.name)).toEqual(["ツール", "開発"]);

    updateBookmark(id, input({ url: "https://github.com/", title: "GitHub.com", tags: "開発", userId: editor }));
    const updated = getBookmark(id)!;
    expect(updated).toMatchObject({ title: "GitHub.com", createdBy: author, updatedBy: editor, updatedByName: "佐藤花子" });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
    expect(updated.tags.map((t) => t.name)).toEqual(["開発"]);
  });

  it("入力を検証する", () => {
    try {
      createBookmark(input({ url: "javascript:alert(1)", title: "", descriptionMd: "x".repeat(10001) }));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).messages).toEqual([
        "URL は http:// または https:// で始まる正しい形式で入力してください",
        "タイトルを入力してください",
        "説明は 10000 文字以内にしてください",
      ]);
    }
  });

  it("同じ URL（正規化後）は重複登録できない。自分自身の更新は可", () => {
    const id = createBookmark(input({ url: "https://dup.example.com/docs", title: "Docs" }));
    expect(() => createBookmark(input({ url: "https://DUP.example.com/docs/#top", title: "別名" }))).toThrow("この URL は「Docs」として登録済みです");
    expect(findBookmarkByUrl("https://dup.example.com/docs/")).toEqual({ id, title: "Docs" });
    expect(findBookmarkByUrl("https://dup.example.com/docs/", id)).toBeUndefined();
    expect(() => updateBookmark(id, input({ url: "https://dup.example.com/docs/", title: "Docs 2" }))).not.toThrow();

    const other = createBookmark(input({ url: "https://dup.example.com/other", title: "Other" }));
    expect(() => updateBookmark(other, input({ url: "https://dup.example.com/docs", title: "Other" }))).toThrow(ValidationError);
  });

  it("不正なファビコンは保存しない", () => {
    const ok = createBookmark(input({ url: "https://icon1.example.com", faviconUrl: "data:image/png;base64,iVBORw0KGgo=" }));
    const bad = createBookmark(input({ url: "https://icon2.example.com", faviconUrl: "javascript:alert(1)" }));
    expect(getBookmark(ok)!.faviconUrl).toBe("data:image/png;base64,iVBORw0KGgo=");
    expect(getBookmark(bad)!.faviconUrl).toBeNull();
  });

  it("存在しないリンクの更新・削除は NotFoundError", () => {
    expect(() => updateBookmark(999999, input({ url: "https://nf.example.com" }))).toThrow(NotFoundError);
    expect(() => deleteBookmark(999999)).toThrow(NotFoundError);
  });

  it("削除すると一覧から消え、同じ URL を登録し直せる", () => {
    const id = createBookmark(input({ url: "https://deleted.example.com", title: "消す" }));
    deleteBookmark(id);
    expect(getBookmark(id)).toBeUndefined();
    expect(() => createBookmark(input({ url: "https://deleted.example.com", title: "再登録" }))).not.toThrow();
  });

  it("登録者のユーザーを削除しても、リンクは残る", () => {
    const temp = createUser({ email: "link-temp@example.com", role: "general", password: "password123" });
    const id = createBookmark(input({ url: "https://orphan.example.com", userId: temp }));
    deleteUser(temp);
    expect(getBookmark(id)).toMatchObject({ createdBy: null, createdByName: null });
  });
});

describe("一覧・検索・並び替え", () => {
  const ids = {
    next: createBookmark(input({ url: "https://nextjs.org/docs", title: "Next.js Documentation", descriptionMd: "React フレームワーク", tags: "検索開発" })),
    figma: createBookmark(input({ url: "https://www.figma.com/", title: "Figma", descriptionMd: "UI デザイン", tags: "検索デザイン" })),
    mdn: createBookmark(input({ url: "https://developer.mozilla.org/", title: "MDN Web Docs", descriptionMd: "Web 技術の資料", tags: "検索開発" })),
  };
  const search = (query: string, tag = "") => listBookmarks({ query, tag, limit: 100, offset: 0 }).bookmarks.map((b) => b.id);

  it("タイトル・URL・説明を、大文字小文字を区別せずに検索する", () => {
    expect(search("NEXT.JS")).toEqual([ids.next]);
    expect(search("mozilla")).toEqual([ids.mdn]);
    expect(search("デザイン")).toEqual([ids.figma]);
    expect(search("docs web")).toEqual([ids.mdn]);
    expect(search("100%")).toEqual([]);
  });

  it("タグで絞り込む（大文字小文字を区別しない）", () => {
    expect(search("", "検索開発").sort()).toEqual([ids.next, ids.mdn].sort());
    expect(search("react", "検索開発")).toEqual([ids.next]);
    expect(search("", "存在しないタグ")).toEqual([]);
  });

  it("並び順は新着順が既定。更新順・タイトル順も選べる", async () => {
    const list = (sort: "new" | "updated" | "title") =>
      listBookmarks({ query: "", tag: "", sort, limit: 100, offset: 0 }).bookmarks.filter((b) => Object.values(ids).includes(b.id)).map((b) => b.id);
    expect(list("new")).toEqual([ids.mdn, ids.figma, ids.next]);
    expect(list("title")).toEqual([ids.figma, ids.mdn, ids.next]);
    await new Promise((r) => setTimeout(r, 5));
    updateBookmark(ids.next, input({ url: "https://nextjs.org/docs", title: "Next.js Documentation", descriptionMd: "React フレームワーク", tags: "検索開発" }));
    expect(list("updated")[0]).toBe(ids.next);
  });

  it("ページ送り用に件数と範囲を返す", () => {
    const first = listBookmarks({ query: "", tag: "検索開発", limit: 1, offset: 0 });
    const second = listBookmarks({ query: "", tag: "検索開発", limit: 1, offset: 1 });
    expect(first.total).toBe(2);
    expect(first.bookmarks).toHaveLength(1);
    expect(second.bookmarks[0].id).not.toBe(first.bookmarks[0].id);
  });
});

describe("Wiki ページとのタグの共有", () => {
  it("同じタグを Wiki ページとリンクで使え、片方から外しても、もう片方で使っていれば残る", () => {
    const pageId = createPage({ title: "共有タグのページ", body: "", folderId: null, position: 0, tags: "共有タグ", userId: null });
    const bookmarkId = createBookmark(input({ url: "https://shared-tag.example.com", tags: "共有タグ" }));
    const tag = findTagByName("共有タグ")!;
    expect(getBookmark(bookmarkId)!.tags).toEqual([tag]);
    expect(listBookmarkTags().find((t) => t.id === tag.id)?.count).toBe(1);

    // ページからタグを外しても、リンクで使っているので残る
    updatePage(pageId, { title: "共有タグのページ", body: "", folderId: null, position: 0, tags: "", userId: null }, 0);
    expect(tagList(pageId)).toBe("");
    expect(listTagNames()).toContain("共有タグ");

    // リンクを消すと、どこからも使われなくなったタグは消える
    deleteBookmark(bookmarkId);
    expect(findTagByName("共有タグ")).toBeUndefined();
    deletePage(pageId);
  });

  it("リンクから外しても、ページで使っているタグは残る", () => {
    const pageId = createPage({ title: "ページ側のタグ", body: "", folderId: null, position: 0, tags: "ページ側", userId: null });
    const bookmarkId = createBookmark(input({ url: "https://page-tag.example.com", tags: "ページ側" }));
    updateBookmark(bookmarkId, input({ url: "https://page-tag.example.com", tags: "" }));
    expect(findTagByName("ページ側")).toBeDefined();
    deletePage(pageId);
    expect(findTagByName("ページ側")).toBeUndefined();
  });
});

describe("リンクの変更履歴", () => {
  it("作成で第 1 版（要約「作成」）ができ、内容が変わったときだけ版が増える", () => {
    const id = createBookmark(input({ url: "https://rev.example.com/a", title: "履歴", descriptionMd: "説明" }));
    expect(listBookmarkRevisions(id).map((r) => [r.number, r.title, r.summary, r.source])).toEqual([[1, "履歴", "作成", null]]);
    updateBookmark(id, input({ url: "https://rev.example.com/a", title: "履歴", descriptionMd: "説明" }));
    expect(listBookmarkRevisions(id)).toHaveLength(1);
    updateBookmark(id, input({ url: "https://rev.example.com/a", title: "履歴2", descriptionMd: "説明" }));
    expect(listBookmarkRevisions(id).map((r) => r.number)).toEqual([2, 1]);
  });

  it("タグだけの変更も版になる", () => {
    const id = createBookmark(input({ url: "https://rev.example.com/tags", tags: "a" }));
    updateBookmark(id, input({ url: "https://rev.example.com/tags", tags: "a, b" }));
    expect(listBookmarkRevisions(id).map((r) => r.tags)).toEqual([["a", "b"], ["a"]]);
  });

  it("タグの順序だけが違う更新は版にしない", () => {
    const id = createBookmark(input({ url: "https://rev.example.com/order", tags: "a, b" }));
    updateBookmark(id, input({ url: "https://rev.example.com/order", tags: "b, a" }));
    expect(listBookmarkRevisions(id)).toHaveLength(1);
  });

  it("今と同じ内容の版への復元は何も変えない（false を返す）", () => {
    const id = createBookmark(input({ url: "https://rev.example.com/same", title: "同じ" }));
    const before = getBookmark(id)!;
    expect(restoreBookmarkRevision(id, 1, null)).toBe(false);
    expect(getBookmark(id)).toMatchObject({ updatedAt: before.updatedAt, updatedBy: before.updatedBy });
    expect(listBookmarkRevisions(id)).toHaveLength(1);
  });

  it("source と更新者を記録する", () => {
    const user = createUser({ email: "rev-user@example.com", displayName: "履歴の人", role: "general", password: "password123" });
    const id = createBookmark(input({ url: "https://rev.example.com/src", userId: user, source: "mcp" }));
    updateBookmark(id, input({ url: "https://rev.example.com/src", title: "画面から", userId: user }));
    expect(listBookmarkRevisions(id).map((r) => [r.source, r.userName])).toEqual([[null, "履歴の人"], ["mcp", "履歴の人"]]);
  });

  it("復元すると内容が戻り、新しい版（要約「第N版に復元」）として記録される", () => {
    const id = createBookmark(input({ url: "https://rev.example.com/r1", title: "元", descriptionMd: "元の説明", tags: "x" }));
    updateBookmark(id, input({ url: "https://rev.example.com/r2", title: "後", descriptionMd: "後の説明", tags: "y" }));
    restoreBookmarkRevision(id, 1, null);
    expect(getBookmark(id)).toMatchObject({ url: "https://rev.example.com/r1", title: "元", descriptionMd: "元の説明" });
    expect(getBookmark(id)!.tags.map((t) => t.name)).toEqual(["x"]);
    const revisions = listBookmarkRevisions(id);
    expect(revisions.map((r) => r.number)).toEqual([3, 2, 1]);
    expect(revisions[0]).toMatchObject({ title: "元", summary: "第1版に復元" });
    expect(() => restoreBookmarkRevision(id, 99, null)).toThrow(NotFoundError);
  });

  it("復元しようとする版の URL が他のリンクと重複するなら拒否する", () => {
    const id = createBookmark(input({ url: "https://rev.example.com/d1", title: "A" }));
    updateBookmark(id, input({ url: "https://rev.example.com/d2", title: "A" }));
    createBookmark(input({ url: "https://rev.example.com/d1", title: "B" }));
    expect(() => restoreBookmarkRevision(id, 1, null)).toThrow(ValidationError);
    expect(listBookmarkRevisions(id)).toHaveLength(2);
  });

  it("リンクを削除すると履歴も消える", () => {
    const id = createBookmark(input({ url: "https://rev.example.com/del" }));
    deleteBookmark(id);
    expect(listBookmarkRevisions(id)).toEqual([]);
  });
});
