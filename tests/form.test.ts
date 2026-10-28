import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/errors";
import { createFolder } from "@/lib/folders";
import { int, positionField } from "@/lib/form";
import { createPage } from "@/lib/pages";

const form = (value: string) => {
  const data = new FormData();
  data.set("position", value);
  return data;
};

describe("表示順の入力", () => {
  it("既定の 0 は「お任せ」として空欄で表示し、それ以外は数字のまま表示する", () => {
    expect(positionField(0)).toBe("");
    expect(positionField(3)).toBe("3");
    expect(positionField(-1)).toBe("-1");
  });

  it("空欄（お任せ）は 0 として受け取り、整数でない値はエラーになる値（NaN）にする", () => {
    expect(int(form(""), "position")).toBe(0);
    expect(int(form("  "), "position")).toBe(0);
    expect(int(new FormData(), "position")).toBe(0);
    expect(int(form("5"), "position")).toBe(5);
    expect(int(form("-2"), "position")).toBe(-2);
    expect(int(form("1.5"), "position")).toBeNaN();
    expect(int(form("abc"), "position")).toBeNaN();
  });
});

describe("表示順の保存", () => {
  it("整数でない表示順はページ・フォルダとも保存できない", () => {
    expect(() => createPage({ title: "表示順のテスト", body: "", folderId: null, position: NaN, tags: "", userId: null })).toThrow(ValidationError);
    expect(() => createFolder({ name: "表示順のテスト", parentId: null, position: NaN })).toThrow(ValidationError);
  });
});
