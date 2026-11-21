import { describe, expect, it } from "vitest";
import { clearPageDraft, isPageDirty, pageDraftKey, readPageDraft, writePageDraft, type PageDraft } from "@/lib/page-draft";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => data.delete(key),
    setItem: (key, value) => data.set(key, value),
  };
}

const initial = { title: "元のタイトル", body: "元の本文", folderId: "", position: "", tags: "" };

describe("ページのローカル下書き", () => {
  it("ページ ID ごとに保存場所を分ける", () => {
    expect(pageDraftKey(3)).toBe("test-wiki:page-draft:3");
    expect(pageDraftKey(null)).toBe("test-wiki:page-draft:new");
    expect(pageDraftKey(3)).not.toBe(pageDraftKey(null));
  });

  it("本文が同じでも要約が入力されていれば未保存", () => {
    expect(isPageDirty({ ...initial, summary: "" }, initial)).toBe(false);
    expect(isPageDirty({ ...initial, summary: "誤字を修正" }, initial)).toBe(true);
    expect(isPageDirty({ ...initial, body: "書きかけ", summary: "" }, initial)).toBe(true);
  });

  it("保存した下書きを読み戻せ、壊れた値は無視する", () => {
    const storage = memoryStorage();
    const draft: PageDraft = {
      title: "下書き",
      body: "本文",
      folderId: "2",
      position: "1",
      tags: "手順",
      summary: "追記",
      savedAt: "2026-11-21T00:00:00.000Z",
    };
    writePageDraft(storage, 8, draft);
    expect(readPageDraft(storage, 8)).toEqual(draft);
    expect(readPageDraft(storage, null)).toBeNull();

    storage.setItem(pageDraftKey(8), "{");
    expect(readPageDraft(storage, 8)).toBeNull();

    writePageDraft(storage, 8, draft);
    clearPageDraft(storage, 8);
    expect(readPageDraft(storage, 8)).toBeNull();
  });
});
