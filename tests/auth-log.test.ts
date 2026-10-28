import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { loginAction } from "@/actions/auth";
import { getDb, run } from "@/lib/db";
import { resetAttempts } from "@/lib/rate-limit";
import { emailHash } from "@/lib/secret";
import { updateSettings } from "@/lib/settings";
import { createUser } from "@/lib/users";

// ログインに失敗する経路だけを通すので、リクエストのヘッダーだけを用意する
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const EMAIL = "Log-Target@Example.com";
const form = (email: string, password: string) => {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
};

let userId: number;
beforeAll(() => {
  getDb();
  updateSettings({ wikiName: "Wiki", description: "" }, { completeSetup: true });
  userId = createUser({ email: EMAIL.toLowerCase(), displayName: "ログ", role: "general", password: "password123" });
});
afterEach(() => vi.restoreAllMocks());

function captureWarn() {
  const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
  return () => spy.mock.calls.map(([line]) => JSON.parse(String(line)));
}

describe("ログイン失敗の構造化ログ", () => {
  it("パスワード違いは reason: invalid とメールアドレスのハッシュだけを書く", async () => {
    const lines = captureWarn();
    const state = await loginAction({}, form(EMAIL, "wrong-password-xyz"));
    expect(state.errors?.[0]).toContain("正しくありません");
    expect(lines()).toEqual([{ time: expect.any(String), level: "warn", event: "auth.login_failed", reason: "invalid", emailHash: emailHash(EMAIL) }]);
    expect(JSON.stringify(lines())).not.toMatch(/example\.com|wrong-password/i);
  });

  it("無効なユーザーは reason: disabled", async () => {
    run("UPDATE users SET status = 'disabled' WHERE id = ?", userId);
    try {
      const lines = captureWarn();
      await loginAction({}, form(EMAIL, "password123"));
      expect(lines()).toMatchObject([{ event: "auth.login_failed", reason: "disabled" }]);
    } finally {
      run("UPDATE users SET status = 'active' WHERE id = ?", userId);
    }
  });

  it("回数制限にかかると reason: rate_limited", async () => {
    const email = "flood@example.com";
    const lines = captureWarn();
    for (let i = 0; i < 25; i++) await loginAction({}, form(email, "x"));
    // IP が分からないときは 20 回まで。それ以降は回数制限として記録される
    expect(lines().map((l) => l.reason)).toEqual([...Array(20).fill("invalid"), ...Array(5).fill("rate_limited")]);
    expect(lines().at(-1)).toMatchObject({ event: "auth.login_failed", emailHash: emailHash(email) });
    resetAttempts(`login-user:${email}`);
  });
});
