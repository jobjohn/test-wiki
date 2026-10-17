import { describe, expect, it } from "vitest";
import { hunks, lineDiff } from "@/lib/diff";
import { formatDateTime } from "@/lib/format";
import { allowAttempt } from "@/lib/rate-limit";
import { decrypt, encrypt } from "@/lib/secret";
import { getDb } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { getSettings, updateSettings } from "@/lib/settings";
import { hashPassword, verifyPassword } from "@/lib/password";
import { safeNext } from "@/lib/access";
import { parseFlash } from "@/lib/flash";

describe("差分", () => {
  it("追加・削除の行数と行番号を出す", () => {
    const diff = lineDiff("a\nb\nc", "a\nB\nc\nd");
    expect(diff.additions).toBe(2);
    expect(diff.deletions).toBe(1);
    expect(diff.lines.find((l) => l.action === "-")).toMatchObject({ oldNumber: 2, text: "b" });
    expect(diff.lines.find((l) => l.text === "d")).toMatchObject({ action: "+", newNumber: 4 });
  });

  it("変更がなければ changed = false", () => {
    expect(lineDiff("same", "same").changed).toBe(false);
  });

  it("変更箇所の前後だけを残し、省略部分を null にする", () => {
    const oldText = Array.from({ length: 20 }, (_, i) => String(i + 1)).join("\n");
    const result = hunks(lineDiff(oldText, oldText.replace("\n10\n", "\nten\n")).lines, 2);
    expect(result[0]).toBeNull();
    expect(result[1]).toHaveLength(6);
    expect(result[result.length - 1]).toBeNull();
    expect(result).toHaveLength(3);
  });
});

describe("暗号・パスワード", () => {
  it("AES-GCM で暗号化・復号でき、改ざんを検出する", () => {
    const encrypted = encrypt("secret-value");
    expect(encrypted).not.toContain("secret-value");
    expect(decrypt(encrypted)).toBe("secret-value");
    const tampered = encrypted.replace(/.$/, (c) => (c === "A" ? "B" : "A"));
    expect(() => decrypt(tampered)).toThrow();
  });

  it("scrypt でハッシュ化し、照合できる（毎回異なるソルト）", () => {
    const a = hashPassword("password123");
    expect(a).not.toBe(hashPassword("password123"));
    expect(verifyPassword("password123", a)).toBe(true);
    expect(verifyPassword("password124", a)).toBe(false);
    expect(verifyPassword("x", "broken")).toBe(false);
  });
});

describe("設定", () => {
  it("初期値は表示モード「システムに合わせる」で、初期設定は未完了", () => {
    getDb();
    const s = getSettings();
    expect(s.colorMode).toBe("system");
    expect(s.setupCompletedAt).toBeNull();
  });

  it("名前・説明・表示モードを保存する", () => {
    updateSettings({ wikiName: "テスト Wiki", description: "", colorMode: "dark" });
    const s = getSettings();
    expect([s.wikiName, s.description, s.colorMode]).toEqual(["テスト Wiki", null, "dark"]);
  });

  it("入力を検証する", () => {
    expect(() => updateSettings({ wikiName: "", description: "" })).toThrow(ValidationError);
    expect(() => updateSettings({ wikiName: "x", description: "", colorMode: "neon" })).toThrow(/表示モード/);
  });

  it("初期設定の完了を記録する", () => {
    updateSettings({ wikiName: "x", description: "" }, { completeSetup: true });
    expect(getSettings().setupCompletedAt).not.toBeNull();
  });
});

describe("その他", () => {
  it("試行回数を制限する", () => {
    const at = 1_000_000;
    for (let i = 0; i < 3; i++) expect(allowAttempt("k", 3, 60_000, at + i)).toBe(true);
    expect(allowAttempt("k", 3, 60_000, at + 10)).toBe(false);
    expect(allowAttempt("k", 3, 60_000, at + 60_001)).toBe(true);
    expect(allowAttempt("other", 3, 60_000, at)).toBe(true);
  });

  it("ログイン後の戻り先はサイト内のパスだけ許可する", () => {
    expect(safeNext("/pages/3?x=1")).toBe("/pages/3?x=1");
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("https://evil.example")).toBeNull();
    expect(safeNext("/\\evil")).toBeNull();
    expect(safeNext(null)).toBeNull();
    for (const bad of ["/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/a\u0000b", "//evil.com", "/\\evil.com", "javascript:alert(1)", "https://evil.com", ""]) {
      expect(safeNext(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(safeNext("/pages/1?x=1#a")).toBe("/pages/1?x=1#a");
  });

  it("日時を設定のタイムゾーンで表示する", () => {
    expect(formatDateTime("2026-09-29T00:05:00.000Z")).toBe("2026/09/29 09:05");
  });
});

describe("フラッシュ Cookie の検証", () => {
  const encode = (value: unknown) => encodeURIComponent(JSON.stringify(value));
  const base = { id: "i", type: "notice", message: "m" };

  it("正しい値とサイト内のリンクを通す", () => {
    expect(parseFlash(encode({ ...base, link: { href: "/pages/1?x=1#a", label: "開く" } }))).toEqual({ ...base, link: { href: "/pages/1?x=1#a", label: "開く" } });
    expect(parseFlash(encode(base))).toEqual(base);
  });

  it("危険なリンクは取り除き、メッセージだけ残す", () => {
    for (const href of ["/\t/evil.com", "/\n/evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "https://evil.com"]) {
      expect(parseFlash(encode({ ...base, link: { href, label: "x" } })), href).toEqual(base);
    }
  });

  it("type・id・message が正しくなければ無視する", () => {
    expect(parseFlash(encode({ ...base, type: "other" }))).toBeNull();
    expect(parseFlash(encode({ ...base, id: 1 }))).toBeNull();
    expect(parseFlash(encode({ ...base, message: null }))).toBeNull();
    expect(parseFlash("not json")).toBeNull();
  });
});
