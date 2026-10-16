import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { authenticate, createUser, enableMfa, findUserByEmail, getUser } from "@/lib/users";

const run = (...args: string[]) =>
  execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", "scripts/reset-password.mjs", ...args], {
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

describe("復旧用スクリプト reset-password", () => {
  it("パスワードを入れ替え、次回変更を求め、ログイン中のセッションと二段階認証を解除する", () => {
    getDb();
    const id = createUser({ email: "locked-out@example.com", role: "general", password: "password123" });
    enableMfa(id, "JBSWY3DPEHPK3PXP");
    getDb().prepare("INSERT INTO sessions (id, user_id, pending_mfa, created_at, expires_at) VALUES ('s1', ?, 0, 'x', 'y')").run(id);

    run("Locked-Out@Example.com", "brand-new-pass", "--reset-mfa");

    expect(authenticate("locked-out@example.com", "password123")).toEqual({ error: "invalid" });
    expect(authenticate("locked-out@example.com", "brand-new-pass")).toMatchObject({ user: { id } });
    const user = getUser(id)!;
    expect(user.mustChangePassword).toBe(true);
    expect(user.mfaEnabled).toBe(false);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(id)).toEqual({ n: 0 });
  });

  it("パスワードを省略すると、ランダムなパスワードを作って表示する", () => {
    getDb();
    createUser({ email: "random-pw@example.com", role: "general", password: "password123" });
    const output = run("random-pw@example.com");
    const generated = /新しいパスワード: (\S+)/.exec(output)?.[1];
    expect(generated).toBeTruthy();
    expect(authenticate("random-pw@example.com", generated!)).toHaveProperty("user");
  });

  it("MFA は --reset-mfa を付けなければ残る", () => {
    getDb();
    const id = createUser({ email: "keep-mfa@example.com", role: "general", password: "password123" });
    enableMfa(id, "JBSWY3DPEHPK3PXP");
    run("keep-mfa@example.com", "another-pass1");
    expect(findUserByEmail("keep-mfa@example.com")?.mfaEnabled).toBe(true);
  });

  it("存在しないユーザーや短いパスワードは失敗する", () => {
    getDb();
    expect(() => run("nobody@example.com", "password123")).toThrow();
    expect(() => run("admin@example.com", "short")).toThrow();
  });

  it("--activate で、無効なユーザーを有効に戻す", () => {
    getDb();
    const id = createUser({ email: "disabled-user@example.com", role: "general", status: "disabled", password: "password123" });
    run("disabled-user@example.com", "password456", "--activate");
    expect(getUser(id)?.status).toBe("active");
    expect(authenticate("disabled-user@example.com", "password456")).toMatchObject({ user: { id } });
  });
});
