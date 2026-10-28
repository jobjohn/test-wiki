import { describe, expect, it } from "vitest";
import { errorFields, formatLog } from "@/lib/log";
import { emailHash } from "@/lib/secret";

describe("構造化ログ", () => {
  it("1 行の JSON にし、undefined の項目は省く", () => {
    const line = formatLog("warn", "auth.login_failed", { reason: "invalid", userId: 3, skipped: undefined, ok: false }, new Date("2026-01-02T03:04:05Z"));
    expect(line).not.toContain("\n");
    expect(JSON.parse(line)).toEqual({ time: "2026-01-02T03:04:05.000Z", level: "warn", event: "auth.login_failed", reason: "invalid", userId: 3, ok: false });
  });

  it("time・level・event は項目で上書きできない。改行を含む値でも 1 行のまま、長い値は切り詰める", () => {
    const line = formatLog("info", "x", { level: "error", event: "forged", note: "a\nb", long: "あ".repeat(600) });
    expect(line).not.toContain("\n");
    const entry = JSON.parse(line);
    expect(entry).toMatchObject({ level: "info", event: "x", note: "a\nb" });
    expect(entry.long).toHaveLength(501);
  });

  it("例外は名前・メッセージ・digest・スタックの先頭をまとめる", () => {
    const error = Object.assign(new TypeError("boom"), { digest: "123" });
    const fields = errorFields(error);
    expect(fields).toMatchObject({ errorName: "TypeError", errorMessage: "boom", digest: "123" });
    expect(String(fields.stack)).not.toContain("\n");
    expect(errorFields("text")).toEqual({ errorName: "string", errorMessage: "text" });
  });
});

describe("メールアドレスのハッシュ", () => {
  it("大文字・小文字や前後の空白が違っても同じ値。元のアドレスは含まない", () => {
    const hash = emailHash("Taro@Example.com");
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(emailHash(" taro@example.com ")).toBe(hash);
    expect(emailHash("hana@example.com")).not.toBe(hash);
  });
});
