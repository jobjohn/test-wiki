import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { totpAt, timeStep } from "@/lib/totp";
import {
  authenticate,
  changePassword,
  confirmMfa,
  createUser,
  deleteUser,
  disableMfa,
  enableMfa,
  ensureDefaultAdmin,
  findUserByUsername,
  getUser,
  pendingMfaSecret,
  regenerateBackupCodes,
  updateUser,
  verifyMfaCode,
} from "@/lib/users";
import { decrypt } from "@/lib/secret";

describe("初期ユーザー", () => {
  it("新しいデータベースに wikiadmin が作られ、初回パスワード変更が必要", () => {
    getDb();
    const admin = findUserByUsername("WikiAdmin")!;
    expect(admin.role).toBe("admin");
    expect(admin.mustChangePassword).toBe(true);
    expect(authenticate("wikiadmin", "wikiadmin")?.id).toBe(admin.id);
    expect(authenticate("wikiadmin", "wrong")).toBeUndefined();
    expect(authenticate("nobody", "wikiadmin")).toBeUndefined();
  });

  it("ユーザーが既にいれば作らない", () => {
    getDb();
    const before = getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    ensureDefaultAdmin();
    const after = getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    expect(after.n).toBe(before.n);
  });
});

describe("ユーザー管理", () => {
  it("ユーザー名とパスワードを検証する", () => {
    expect(() => createUser({ username: "ab", role: "editor", password: "password123" })).toThrow(ValidationError);
    expect(() => createUser({ username: "valid_name", role: "editor", password: "short" })).toThrow(ValidationError);
    expect(() => createUser({ username: "valid_name", role: "editor", password: "password123", passwordConfirmation: "x" })).toThrow(ValidationError);
    const id = createUser({ username: "Valid_Name", role: "editor", password: "password123" });
    expect(() => createUser({ username: "valid_NAME", role: "viewer", password: "password123" })).toThrow(/既に使われています/);
    expect(getUser(id)?.username).toBe("Valid_Name");
  });

  it("最後の管理者は降格も削除もできない", () => {
    const admin = findUserByUsername("wikiadmin")!;
    expect(() => updateUser(admin.id, { username: "wikiadmin", role: "editor" })).toThrow(/管理者が 1 人もいなくなります/);
    expect(() => deleteUser(admin.id)).toThrow(/最後の管理者/);

    const second = createUser({ username: "admin2", role: "admin", password: "password123" });
    updateUser(admin.id, { username: "wikiadmin", role: "editor" });
    expect(getUser(admin.id)?.role).toBe("editor");
    expect(() => deleteUser(second)).toThrow(/最後の管理者/);
    updateUser(admin.id, { username: "wikiadmin", role: "admin" });
  });

  it("パスワード変更は他の端末のセッションを無効化する", () => {
    const id = createUser({ username: "session_user", role: "editor", password: "password123" });
    const db = getDb();
    const insert = db.prepare("INSERT INTO sessions (id, user_id, pending_mfa, created_at, expires_at) VALUES (?, ?, 0, 'x', 'y')");
    insert.run("keep", id);
    insert.run("drop", id);
    changePassword(id, "new-password-1", "keep");
    const ids = (db.prepare("SELECT id FROM sessions WHERE user_id = ?").all(id) as { id: string }[]).map((r) => r.id);
    expect(ids).toEqual(["keep"]);
    expect(authenticate("session_user", "new-password-1")?.id).toBe(id);
    expect(authenticate("session_user", "password123")).toBeUndefined();
  });
});

describe("二段階認証", () => {
  it("設定 → パスコード確認 → 有効化、シークレットは暗号化して保存される", () => {
    const id = createUser({ username: "mfa_user", role: "editor", password: "password123" });
    const secret = pendingMfaSecret(id);
    expect(pendingMfaSecret(id)).toBe(secret);
    expect(getUser(id)?.mfaEnabled).toBe(false);

    expect(confirmMfa(id, "000000")).toBeNull();
    const codes = confirmMfa(id, totpAt(secret, timeStep()));
    expect(codes).toHaveLength(10);
    expect(getUser(id)?.mfaEnabled).toBe(true);

    const stored = (getDb().prepare("SELECT otp_secret FROM users WHERE id = ?").get(id) as { otp_secret: string }).otp_secret;
    expect(stored).not.toContain(secret);
    expect(decrypt(stored)).toBe(secret);
  });

  it("パスコードは 1 回だけ使え、バックアップコードも 1 回だけ使える", () => {
    const id = createUser({ username: "mfa_login", role: "editor", password: "password123" });
    const secret = "JBSWY3DPEHPK3PXP";
    const codes = enableMfa(id, secret);

    const step = timeStep();
    const code = totpAt(secret, step);
    expect(verifyMfaCode(id, code)).toBe(true);
    expect(verifyMfaCode(id, code)).toBe(false);

    expect(verifyMfaCode(id, codes[0].toUpperCase())).toBe(true);
    expect(verifyMfaCode(id, codes[0])).toBe(false);
    expect(getUser(id)?.remainingBackupCodes).toBe(9);

    expect(regenerateBackupCodes(id)).toHaveLength(10);
    expect(verifyMfaCode(id, codes[1])).toBe(false);

    disableMfa(id);
    expect(getUser(id)?.mfaEnabled).toBe(false);
    expect(verifyMfaCode(id, totpAt(secret, step + 1))).toBe(false);
  });
});
