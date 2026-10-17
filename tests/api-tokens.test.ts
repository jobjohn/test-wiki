import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createApiToken, bearerToken, listApiTokens, revokeApiToken, TOKEN_LIMIT_PER_USER, verifyApiToken } from "@/lib/api-tokens";
import { get, getDb, run } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { enableMfa, createUser, deleteUser, updateUser } from "@/lib/users";
import { updateSettings } from "@/lib/settings";

let seq = 0;
const newUser = () => createUser({ email: `token-user-${++seq}@example.com`, role: "general", password: "password123" });

beforeAll(() => {
  getDb();
  // 初期管理者の初期設定を済ませる（未完了だと管理者のトークンは拒否される）
  updateSettings({ wikiName: "Wiki", description: "" }, { completeSetup: true });
});

describe("アクセストークンの発行", () => {
  it("平文は戻り値で 1 回だけ得られ、DB にはハッシュだけが入る", () => {
    const userId = newUser();
    const { token, summary } = createApiToken(userId, { name: "ノート PC" });
    expect(token).toMatch(/^wiki_[A-Za-z0-9_-]{43}$/);

    const row = get<Record<string, unknown>>("SELECT * FROM api_tokens WHERE id = ?", summary.id)!;
    expect(row.token_hash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(row.scope).toBe("read");
    expect(Object.values(row)).not.toContain(token);
    expect(row.token_prefix).toBe(token.slice(0, 9));

    // 一覧にも平文・ハッシュは出ない
    const listed = listApiTokens(userId);
    expect(JSON.stringify(listed)).not.toContain(token);
    expect(JSON.stringify(listed)).not.toContain(row.token_hash as string);
    expect(listed[0]).toMatchObject({ name: "ノート PC", scope: "read", lastUsedAt: null });
  });

  it("有効期限の選択肢（既定 90 日・無期限）", () => {
    const userId = newUser();
    const at = new Date("2026-01-01T00:00:00Z");
    expect(createApiToken(userId, { name: "既定" }, at).summary.expiresAt).toBe("2026-04-01T00:00:00.000Z");
    expect(createApiToken(userId, { name: "30", expiry: "30" }, at).summary.expiresAt).toBe("2026-01-31T00:00:00.000Z");
    expect(createApiToken(userId, { name: "1年", expiry: "365" }, at).summary.expiresAt).toBe("2027-01-01T00:00:00.000Z");
    expect(createApiToken(userId, { name: "無期限", expiry: "never" }, at).summary.expiresAt).toBeNull();
  });

  it("名前は必須・50 文字以内、有効期限は選択肢のみ", () => {
    const userId = newUser();
    expect(() => createApiToken(userId, { name: "  " })).toThrow(ValidationError);
    expect(() => createApiToken(userId, { name: "あ".repeat(51) })).toThrow(ValidationError);
    expect(() => createApiToken(userId, { name: "x", expiry: "7" })).toThrow(ValidationError);
    expect(() => createApiToken(userId, { name: "x", expiry: "toString" })).toThrow(ValidationError);
    expect(() => createApiToken(userId, { name: "あ".repeat(50) })).not.toThrow();
  });

  it("1 ユーザーあたりの上限", () => {
    const userId = newUser();
    for (let i = 0; i < TOKEN_LIMIT_PER_USER; i++) createApiToken(userId, { name: `t${i}` });
    expect(() => createApiToken(userId, { name: "超過" })).toThrow(/20 個まで/);
    // 他のユーザーには影響しない
    expect(() => createApiToken(newUser(), { name: "ok" })).not.toThrow();
  });
});

describe("アクセストークンの検証", () => {
  it("正しいトークンでユーザーが分かり、最終使用日時は 1 分以上空いたときだけ更新される", () => {
    const userId = newUser();
    const { token, summary } = createApiToken(userId, { name: "t" });
    const t0 = new Date();
    expect(verifyApiToken(token, t0)?.user.id).toBe(userId);
    const lastUsed = () => get<{ last_used_at: string }>("SELECT last_used_at FROM api_tokens WHERE id = ?", summary.id)!.last_used_at;
    expect(lastUsed()).toBe(t0.toISOString());

    verifyApiToken(token, new Date(t0.getTime() + 30_000));
    expect(lastUsed()).toBe(t0.toISOString());
    const later = new Date(t0.getTime() + 61_000);
    verifyApiToken(token, later);
    expect(lastUsed()).toBe(later.toISOString());
  });

  it("存在しない・形式の違うトークンは拒否", () => {
    expect(verifyApiToken("wiki_nonexistent")).toBeNull();
    expect(verifyApiToken("abc")).toBeNull();
    expect(verifyApiToken("")).toBeNull();
  });

  it("期限切れは拒否", () => {
    const userId = newUser();
    const at = new Date("2026-01-01T00:00:00Z");
    const { token } = createApiToken(userId, { name: "t", expiry: "30" }, at);
    expect(verifyApiToken(token, new Date("2026-01-30T00:00:00Z"))).not.toBeNull();
    expect(verifyApiToken(token, new Date("2026-01-31T00:00:00Z"))).toBeNull();
  });

  it("取り消したトークンは拒否", () => {
    const userId = newUser();
    const { token, summary } = createApiToken(userId, { name: "t" });
    expect(revokeApiToken(userId, summary.id)).toBe(true);
    expect(verifyApiToken(token)).toBeNull();
  });

  it("他人のトークンは取り消せない", () => {
    const owner = newUser();
    const other = newUser();
    const { token, summary } = createApiToken(owner, { name: "t" });
    expect(revokeApiToken(other, summary.id)).toBe(false);
    expect(verifyApiToken(token)?.user.id).toBe(owner);
  });

  it("無効にしたユーザー・削除したユーザーのトークンは使えない", () => {
    const disabled = newUser();
    const { token } = createApiToken(disabled, { name: "t" });
    expect(verifyApiToken(token)).not.toBeNull();
    updateUser(disabled, { email: `disabled-${disabled}@example.com`, role: "general", status: "disabled" });
    expect(verifyApiToken(token)).toBeNull();
    updateUser(disabled, { email: `disabled-${disabled}@example.com`, role: "general", status: "active" });
    expect(verifyApiToken(token)).not.toBeNull();

    const removed = newUser();
    const second = createApiToken(removed, { name: "t" });
    deleteUser(removed);
    expect(verifyApiToken(second.token)).toBeNull();
    // トークンの行も一緒に消える
    expect(get("SELECT 1 FROM api_tokens WHERE id = ?", second.summary.id)).toBeUndefined();
  });

  it("MFA が必須で、ユーザーが未設定なら拒否（設定すれば使える）", () => {
    const userId = newUser();
    const { token } = createApiToken(userId, { name: "t" });
    updateSettings({ wikiName: "Wiki", description: "", requireMfa: true });
    try {
      expect(verifyApiToken(token)).toBeNull();
      enableMfa(userId, "JBSWY3DPEHPK3PXP");
      expect(verifyApiToken(token)?.user.id).toBe(userId);
    } finally {
      updateSettings({ wikiName: "Wiki", description: "", requireMfa: false });
    }
  });

  it("MFA 未設定で使えなくなったユーザーも、トークンを取り消せる", () => {
    const userId = newUser();
    const { token, summary } = createApiToken(userId, { name: "t" });
    updateSettings({ wikiName: "Wiki", description: "", requireMfa: true });
    try {
      expect(verifyApiToken(token)).toBeNull();
      expect(revokeApiToken(userId, summary.id)).toBe(true);
    } finally {
      updateSettings({ wikiName: "Wiki", description: "", requireMfa: false });
    }
    expect(listApiTokens(userId)).toHaveLength(0);
  });

  it("パスワード変更が必須のユーザーは拒否", () => {
    const userId = newUser();
    const { token } = createApiToken(userId, { name: "t" });
    run("UPDATE users SET must_change_password = 1 WHERE id = ?", userId);
    expect(verifyApiToken(token)).toBeNull();
  });
});

describe("Authorization ヘッダー", () => {
  it("Bearer の値を取り出す", () => {
    expect(bearerToken("Bearer wiki_abc")).toBe("wiki_abc");
    expect(bearerToken("bearer wiki_abc")).toBe("wiki_abc");
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});
