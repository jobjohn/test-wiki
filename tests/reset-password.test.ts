import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { authenticate, createUser, enableMfa, findUserByUsername, getUser } from "@/lib/users";

const run = (...args: string[]) =>
  execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", "scripts/reset-password.mjs", ...args], {
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

describe("復旧用スクリプト reset-password", () => {
  it("パスワードを入れ替え、次回変更を求め、ログイン中のセッションと二段階認証を解除する", () => {
    getDb();
    const id = createUser({ username: "locked_out", role: "editor", password: "password123" });
    enableMfa(id, "JBSWY3DPEHPK3PXP");
    getDb().prepare("INSERT INTO sessions (id, user_id, pending_mfa, created_at, expires_at) VALUES ('s1', ?, 0, 'x', 'y')").run(id);

    run("Locked_Out", "brand-new-pass", "--reset-mfa");

    expect(authenticate("locked_out", "password123")).toBeUndefined();
    expect(authenticate("locked_out", "brand-new-pass")?.id).toBe(id);
    const user = getUser(id)!;
    expect(user.mustChangePassword).toBe(true);
    expect(user.mfaEnabled).toBe(false);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(id)).toEqual({ n: 0 });
  });

  it("パスワードを省略すると、ランダムなパスワードを作って表示する", () => {
    getDb();
    createUser({ username: "random_pw", role: "editor", password: "password123" });
    const output = run("random_pw");
    const generated = /新しいパスワード: (\S+)/.exec(output)?.[1];
    expect(generated).toBeTruthy();
    expect(authenticate("random_pw", generated!)).toBeDefined();
  });

  it("MFA は --reset-mfa を付けなければ残る", () => {
    getDb();
    const id = createUser({ username: "keep_mfa", role: "editor", password: "password123" });
    enableMfa(id, "JBSWY3DPEHPK3PXP");
    run("keep_mfa", "another-pass1");
    expect(findUserByUsername("keep_mfa")?.mfaEnabled).toBe(true);
  });

  it("存在しないユーザーや短いパスワードは失敗する", () => {
    getDb();
    expect(() => run("nobody_here", "password123")).toThrow();
    expect(() => run("wikiadmin", "short")).toThrow();
  });
});
