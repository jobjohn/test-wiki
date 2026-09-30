import { describe, expect, it } from "vitest";
import { hunks, lineDiff } from "@/lib/diff";
import { formatDateTime } from "@/lib/format";
import { allowAttempt } from "@/lib/rate-limit";
import { decrypt, encrypt } from "@/lib/secret";
import { getDb } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { contrastColor, cssVariables, currentThemeKey, getSettings, THEMES, updateSettings } from "@/lib/settings";
import { hashPassword, verifyPassword } from "@/lib/password";
import { safeNext } from "@/lib/access";

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
  it("初期値はベース白・メイン青・差し色緑のスタンダード", () => {
    getDb();
    const s = getSettings();
    expect([s.secondaryColor, s.primaryColor, s.accentColor]).toEqual(["#ffffff", "#2563eb", "#16a34a"]);
    expect(currentThemeKey(s)).toBe("standard");
    expect(s.setupCompletedAt).toBeNull();
  });

  it("プリセットを適用し、色を変えるとカスタムになる", () => {
    updateSettings({ wikiName: "テスト Wiki", description: "説明", theme: "forest" });
    expect(currentThemeKey(getSettings())).toBe("forest");
    updateSettings({ wikiName: "テスト Wiki", description: "", theme: "custom", primaryColor: "#123456" });
    expect(currentThemeKey(getSettings())).toBe("custom");
    expect(getSettings().primaryColor).toBe("#123456");
    expect(getSettings().description).toBeNull();
  });

  it("入力を検証する", () => {
    expect(() => updateSettings({ wikiName: "", description: "" })).toThrow(ValidationError);
    expect(() => updateSettings({ wikiName: "x", description: "", primaryColor: "red" })).toThrow(/メインカラー/);
    expect(() => updateSettings({ wikiName: "x", description: "", colorMode: "neon" })).toThrow(/表示モード/);
  });

  it("初期設定の完了を記録する", () => {
    updateSettings({ wikiName: "x", description: "" }, { completeSetup: true });
    expect(getSettings().setupCompletedAt).not.toBeNull();
  });

  it("背景色に応じて読める文字色（白/黒）を選ぶ", () => {
    expect(contrastColor("#ffffff")).toBe("#111827");
    expect(contrastColor("#0f172a")).toBe("#ffffff");
    expect(contrastColor("#2563eb")).toBe("#ffffff");
    expect(cssVariables({ primaryColor: "#2563eb", secondaryColor: "#ffffff", accentColor: "#16a34a" })).toContain("--base-foreground: #111827;");
    expect(Object.keys(THEMES)[0]).toBe("standard");
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
  });

  it("日時を設定のタイムゾーンで表示する", () => {
    expect(formatDateTime("2026-09-29T00:05:00.000Z")).toBe("2026/09/29 09:05");
  });
});
