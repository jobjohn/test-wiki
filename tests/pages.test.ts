import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { StaleError, ValidationError } from "@/lib/errors";
import { createFolder } from "@/lib/folders";
import {
  backlinksFor,
  createPage,
  deletePage,
  findPageByTitle,
  findTagByName,
  getPage,
  getRevision,
  latestRevision,
  listRevisions,
  listTagNames,
  listTagsWithCounts,
  restoreRevision,
  searchPages,
  tagList,
  updatePage,
  type PageInput,
} from "@/lib/pages";
import { createUser } from "@/lib/users";
import { renameWikiLinks } from "@/lib/wikilinks";

const input = (overrides: Partial<PageInput> = {}): PageInput => ({
  title: "無題",
  body: "",
  folderId: null,
  position: 0,
  tags: "",
  userId: null,
  ...overrides,
});

describe("ページと履歴", () => {
  it("作成時と本文・タイトルの変更時に版を記録し、それ以外の変更では記録しない", () => {
    getDb();
    const userId = createUser({ email: "author@example.com", displayName: "編集 太郎", role: "general", password: "password123" });
    const id = createPage(input({ title: "履歴テスト", body: "one", summary: "作成", userId }));
    expect(listRevisions(id).map((r) => r.number)).toEqual([1]);

    let page = getPage(id)!;
    updatePage(id, input({ title: "履歴テスト", body: "two", summary: "更新", userId }), page.lockVersion);
    expect(listRevisions(id).map((r) => r.number)).toEqual([2, 1]);
    expect(latestRevision(id)).toMatchObject({ summary: "更新", userName: "編集 太郎" });

    page = getPage(id)!;
    updatePage(id, input({ title: "履歴テスト", body: "two", position: 5, userId }), page.lockVersion);
    expect(listRevisions(id)).toHaveLength(2);
    expect(getPage(id)?.position).toBe(5);
  });

  it("改行コードを LF にそろえる", () => {
    const id = createPage(input({ title: "改行", body: "a\r\nb\rc" }));
    expect(getPage(id)?.body).toBe("a\nb\nc");
  });

  it("タイトルは大文字小文字・全角半角を区別せず一意", () => {
    createPage(input({ title: "Guide Page" }));
    expect(() => createPage(input({ title: "guide  page" }))).toThrow(/同じタイトル/);
    expect(() => createPage(input({ title: "ＧＵＩＤＥ　ＰＡＧＥ" }))).toThrow(/同じタイトル/);
    expect(findPageByTitle("GUIDE PAGE")?.title).toBe("Guide Page");
  });

  it("入力を検証する", () => {
    expect(() => createPage(input({ title: "  " }))).toThrow(ValidationError);
    expect(() => createPage(input({ title: "x".repeat(201) }))).toThrow(ValidationError);
    expect(() => createPage(input({ title: "存在しないフォルダ", folderId: 99999 }))).toThrow(/フォルダが存在しません/);
  });

  it("古い lock_version での更新は競合として拒否する", () => {
    const id = createPage(input({ title: "競合", body: "base" }));
    const stale = getPage(id)!.lockVersion;
    updatePage(id, input({ title: "競合", body: "someone else" }), stale);
    expect(() => updatePage(id, input({ title: "競合", body: "mine" }), stale)).toThrow(StaleError);
    expect(getPage(id)?.body).toBe("someone else");
  });

  it("過去の版に戻すと新しい版として保存される", () => {
    const id = createPage(input({ title: "復元", body: "v1" }));
    updatePage(id, input({ title: "復元", body: "v2" }), getPage(id)!.lockVersion);
    restoreRevision(id, 1, null);
    expect(getPage(id)?.body).toBe("v1");
    expect(latestRevision(id)).toMatchObject({ number: 3, summary: "第1版に復元" });
    expect(getRevision(id, 2)?.body).toBe("v2");
  });

  it("削除すると履歴も消え、使われなくなったタグも消える", () => {
    const id = createPage(input({ title: "削除対象", tags: "消えるタグ" }));
    expect(findTagByName("消えるタグ")).toBeDefined();
    deletePage(id);
    expect(getPage(id)).toBeUndefined();
    expect(listRevisions(id)).toEqual([]);
    expect(findTagByName("消えるタグ")).toBeUndefined();
  });
});

describe("タグ", () => {
  it("カンマ・読点・空白区切りで、大文字小文字を区別せず再利用する", () => {
    const id = createPage(input({ title: "タグ付き", tags: "Ruby, rails　手順書、ruby a/b" }));
    expect(tagList(id).split(", ").sort()).toEqual(["Ruby", "ab", "rails", "手順書"].sort());
    const other = createPage(input({ title: "別のページ", tags: "RUBY" }));
    expect(findTagByName("ruby")?.name).toBe("Ruby");
    expect(tagList(other)).toBe("Ruby");
    expect(listTagNames()).toContain("手順書");
    expect(listTagsWithCounts().find((t) => t.name === "Ruby")?.count).toBe(2);
  });

  it("更新でタグを付け替えられる", () => {
    const id = createPage(input({ title: "付け替え", tags: "a1, b1" }));
    updatePage(id, input({ title: "付け替え", tags: "b1, c1" }), getPage(id)!.lockVersion);
    expect(tagList(id)).toBe("b1, c1");
  });
});

describe("検索とリンク", () => {
  it("空白区切りの全キーワードをタイトルか本文から探す（% や _ は文字として扱う）", () => {
    createPage(input({ title: "Docker 手順", body: "compose で起動" }));
    createPage(input({ title: "Other", body: "docker だけ" }));
    createPage(input({ title: "割合", body: "達成率は 100% です_" }));

    expect(searchPages("docker compose", 10, 0).pages.map((p) => p.title)).toEqual(["Docker 手順"]);
    expect(searchPages("DOCKER", 10, 0).total).toBe(2);
    expect(searchPages("100%", 10, 0).pages.map((p) => p.title)).toEqual(["割合"]);
    expect(searchPages("%", 10, 0).total).toBe(1);
    expect(searchPages("Docker", 10, 0).pages[0].title).toBe("Docker 手順");
  });

  it("このページへ [[リンク]] しているページを探す（コード内は除く）", () => {
    const target = createPage(input({ title: "リンク先" }));
    createPage(input({ title: "リンク元", body: "詳しくは [[リンク先]] を参照" }));
    createPage(input({ title: "別名リンク", body: "[[リンク先|こちら]]" }));
    createPage(input({ title: "コード内", body: "`[[リンク先]]`" }));
    createPage(input({ title: "無関係", body: "[[リンク先2]]" }));
    expect(backlinksFor(getPage(target)!).map((p) => p.title)).toEqual(["リンク元", "別名リンク"].sort((a, b) => a.localeCompare(b, "ja")));
  });

  it("フォルダに入れられる", () => {
    const folder = createFolder({ name: "ページ用", parentId: null, position: 0 });
    const id = createPage(input({ title: "フォルダ内", folderId: folder }));
    expect(getPage(id)?.folderId).toBe(folder);
  });
});

describe("改名とリンクの書き換え", () => {
  it("[[旧名]] を keyOf と同じ規則で照合し、表示名とコード内はそのまま残す", () => {
    const body = "[[Old  Name]] [[ｏｌｄ name|こちら]] [[old name2]] `[[old name]]`\n```\n[[old name]]\n```\n[[ old name ]]";
    expect(renameWikiLinks(body, "Old Name", "新しい名前")).toBe(
      "[[新しい名前]] [[新しい名前|こちら]] [[old name2]] `[[old name]]`\n```\n[[old name]]\n```\n[[新しい名前]]",
    );
    // Wiki リンクで書けないタイトルには書き換えない
    expect(renameWikiLinks("[[old name]]", "old name", "a|b")).toBe("[[old name]]");
  });

  it("改名すると他のページのリンクを同じトランザクションで書き換え、版とリンクの索引も更新する", () => {
    const userId = createUser({ email: "renamer@example.com", displayName: "改名 花子", role: "general", password: "password123" });
    const target = createPage(input({ title: "改名前" }));
    const source = createPage(input({ title: "改名リンク元", body: "[[改名前]] と [[改名前|別名]]", tags: "残るタグ" }));
    const untouched = createPage(input({ title: "改名無関係", body: "[[改名前2]]" }));
    const sourceLock = getPage(source)!.lockVersion;

    const result = updatePage(target, input({ title: "改名後", userId }), getPage(target)!.lockVersion);
    expect(result).toEqual({ relinkedPages: 1 });
    expect(getPage(source)!.body).toBe("[[改名後]] と [[改名後|別名]]");
    expect(getPage(source)!.lockVersion).toBe(sourceLock + 1);
    expect(tagList(source)).toBe("残るタグ");
    expect(latestRevision(source)).toMatchObject({ number: 2, userName: "改名 花子", summary: "「改名前」→「改名後」の改名に合わせてリンクを更新" });
    expect(backlinksFor(getPage(target)!).map((p) => p.title)).toEqual(["改名リンク元"]);
    expect(getPage(untouched)!.body).toBe("[[改名前2]]");
    expect(listRevisions(untouched)).toHaveLength(1);

    // 大文字小文字だけの変更はリンクが切れないので書き換えない
    const latin = createPage(input({ title: "Case Page" }));
    const linker = createPage(input({ title: "Case Linker", body: "[[case page]]" }));
    expect(updatePage(latin, input({ title: "CASE PAGE" }), getPage(latin)!.lockVersion)).toEqual({ relinkedPages: 0 });
    expect(getPage(linker)!.body).toBe("[[case page]]");
  });

  it("リンク元の書き換えに失敗すると改名ごと取り消す", () => {
    const target = createPage(input({ title: "取り消し前" }));
    const source = createPage(input({ title: "取り消しリンク元", body: "[[取り消し前]]" }));
    getDb().exec(
      `CREATE TEMP TRIGGER fail_relink BEFORE UPDATE OF body ON pages WHEN new.id = ${source} BEGIN SELECT RAISE(ABORT, 'boom'); END`,
    );
    try {
      expect(() => updatePage(target, input({ title: "取り消し後" }), getPage(target)!.lockVersion)).toThrow(/boom/);
    } finally {
      getDb().exec("DROP TRIGGER fail_relink");
    }
    expect(getPage(target)!.title).toBe("取り消し前");
    expect(getPage(source)!.body).toBe("[[取り消し前]]");
  });
});
