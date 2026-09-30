import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import {
  ancestorsOf,
  createFolder,
  dissolveFolder,
  folderOptions,
  folderPathName,
  getFolder,
  selfAndDescendantIds,
  updateFolder,
} from "@/lib/folders";
import { createPage, getPage } from "@/lib/pages";

const make = (name: string, parentId: number | null = null) => createFolder({ name, parentId, position: 0 });

describe("フォルダ", () => {
  it("入れ子にでき、パスと選択肢が階層順に得られる", () => {
    getDb();
    const a = make("A1");
    const b = make("B1", a);
    const c = make("C1", b);
    expect(folderPathName(getFolder(c)!)).toBe("A1 / B1 / C1");
    expect(ancestorsOf(getFolder(c)!).map((f) => f.id)).toEqual([a, b]);
    expect(selfAndDescendantIds(a).sort()).toEqual([a, b, c].sort());
    const labels = folderOptions().map((o) => o.label);
    expect(labels.indexOf("A1")).toBeLessThan(labels.indexOf("A1 / B1"));
    expect(labels).toContain("A1 / B1 / C1");
    expect(folderOptions(selfAndDescendantIds(b)).map((o) => o.label)).not.toContain("A1 / B1");
  });

  it("自分自身やサブフォルダの中へは移動できない", () => {
    const a = make("Cycle-A");
    const b = make("Cycle-B", a);
    expect(() => updateFolder(a, { name: "Cycle-A", parentId: b, position: 0 })).toThrow(ValidationError);
    expect(() => updateFolder(a, { name: "Cycle-A", parentId: a, position: 0 })).toThrow(ValidationError);
    updateFolder(b, { name: "Cycle-B", parentId: null, position: 1 });
    expect(getFolder(b)).toMatchObject({ parentId: null, position: 1 });
  });

  it("同じ場所での同名（大文字小文字・全角半角違い）は作れない。別の場所なら作れる", () => {
    const a = make("Dup-Parent");
    make("Same", a);
    expect(() => make("same", a)).toThrow(/既に存在/);
    expect(() => make("Ｓａｍｅ", a)).toThrow(/既に存在/);
    expect(() => make("Same")).not.toThrow();
    expect(() => make("Same")).toThrow(/既に存在/);
  });

  it("削除するとページとサブフォルダは 1 つ上へ移動する", () => {
    const a = make("Dis-A");
    const b = make("Dis-B", a);
    const c = make("Dis-C", b);
    const pageId = createPage({ title: "in dissolved folder", body: "", folderId: b, position: 0, tags: "", userId: null });
    dissolveFolder(b);
    expect(getFolder(b)).toBeUndefined();
    expect(getFolder(c)?.parentId).toBe(a);
    expect(getPage(pageId)?.folderId).toBe(a);
  });

  it("移動先に同名フォルダがあれば削除を中止する", () => {
    const a = make("Conf-A");
    const b = make("Conf-B", a);
    make("Inner", a);
    make("Inner", b);
    expect(() => dissolveFolder(b)).toThrow(/同名のフォルダ/);
    expect(getFolder(b)).toBeDefined();
  });
});
