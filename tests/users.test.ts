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
  findUserByEmail,
  getUser,
  pendingMfaSecret,
  canEdit,
  isAdmin,
  regenerateBackupCodes,
  updateProfile,
  updateUser,
  verifyMfaCode,
} from "@/lib/users";
import { decrypt } from "@/lib/secret";

const loginId = (email: string, password: string) => {
  const result = authenticate(email, password);
  return "user" in result ? result.user.id : result.error;
};

describe("初期ユーザー", () => {
  it("新しいデータベースに初期管理者が作られ、メールアドレスでログインでき、初回パスワード変更が必要", () => {
    getDb();
    const admin = findUserByEmail("Admin@Example.com")!;
    expect(admin.role).toBe("admin");
    expect(admin.status).toBe("active");
    expect(admin.mustChangePassword).toBe(true);
    expect(loginId("admin@example.com", "wikiadmin")).toBe(admin.id);
    expect(loginId("admin@example.com", "wrong")).toBe("invalid");
    expect(loginId("nobody@example.com", "wikiadmin")).toBe("invalid");
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
  it("メールアドレスとパスワードを検証する", () => {
    expect(() => createUser({ email: "not-an-email", role: "general", password: "password123" })).toThrow(/メールアドレスの形式/);
    expect(() => createUser({ email: "valid@example.com", role: "general", password: "short" })).toThrow(ValidationError);
    expect(() => createUser({ email: "valid@example.com", role: "general", password: "password123", passwordConfirmation: "x" })).toThrow(
      ValidationError,
    );
    expect(() => createUser({ email: "valid@example.com", role: "viewer" as never, password: "password123" })).toThrow(/ロールが不正/);
    const id = createUser({ email: "Valid@Example.com", role: "general", password: "password123" });
    expect(() => createUser({ email: "valid@EXAMPLE.com", role: "general", password: "password123" })).toThrow(/既に使われています/);
    expect(getUser(id)?.email).toBe("Valid@Example.com");
    expect(getUser(id)?.name).toBe("Valid");
  });

  it("一般ユーザーは編集できるが管理はできない。無効なユーザーはどちらもできない", () => {
    const general = { role: "general" as const, status: "active" as const };
    expect(canEdit(general)).toBe(true);
    expect(isAdmin(general)).toBe(false);
    expect(isAdmin({ role: "admin", status: "active" })).toBe(true);
    expect(canEdit({ role: "admin", status: "disabled" })).toBe(false);
    expect(isAdmin({ role: "admin", status: "disabled" })).toBe(false);
  });

  it("最後の有効な管理者は、降格・無効化・削除ができない", () => {
    const admin = findUserByEmail("admin@example.com")!;
    const base = { email: "admin@example.com", role: "admin" as const, status: "active" as const };
    expect(() => updateUser(admin.id, { ...base, role: "general" })).toThrow(/有効な管理者が 1 人もいなくなります/);
    expect(() => updateUser(admin.id, { ...base, status: "disabled" })).toThrow(/有効な管理者が 1 人もいなくなります/);
    expect(() => deleteUser(admin.id)).toThrow(/最後の有効な管理者/);

    // 無効な管理者は数に入らない
    const disabledAdmin = createUser({ email: "off-admin@example.com", role: "admin", status: "disabled", password: "password123" });
    expect(() => updateUser(admin.id, { ...base, role: "general" })).toThrow(/有効な管理者/);

    const second = createUser({ email: "admin2@example.com", role: "admin", password: "password123" });
    updateUser(admin.id, { ...base, role: "general" });
    expect(getUser(admin.id)?.role).toBe("general");
    expect(() => deleteUser(second)).toThrow(/最後の有効な管理者/);
    updateUser(admin.id, base);
    deleteUser(disabledAdmin);
  });

  it("無効にするとログインできず、ログイン中のセッションも消える。有効に戻すとログインできる", () => {
    const id = createUser({ email: "member@example.com", displayName: "メンバー", role: "general", password: "password123" });
    getDb().prepare("INSERT INTO sessions (id, user_id, pending_mfa, created_at, expires_at) VALUES ('m1', ?, 0, 'x', 'y')").run(id);
    const base = { email: "member@example.com", displayName: "メンバー", role: "general" as const };
    updateUser(id, { ...base, status: "disabled" });
    expect(getUser(id)?.status).toBe("disabled");
    expect(loginId("member@example.com", "password123")).toBe("disabled");
    expect(loginId("member@example.com", "wrong-pass")).toBe("invalid");
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(id)).toEqual({ n: 0 });
    updateUser(id, { ...base, status: "active" });
    expect(loginId("member@example.com", "password123")).toBe(id);
  });

  it("本人がメールアドレスと表示名を変更できる（他人のアドレスは使えない）", () => {
    const id = createUser({ email: "profile@example.com", role: "general", password: "password123" });
    updateProfile(id, { email: "renamed@example.com", displayName: "改名" });
    expect(getUser(id)).toMatchObject({ email: "renamed@example.com", displayName: "改名" });
    expect(() => updateProfile(id, { email: "admin@example.com", displayName: "" })).toThrow(/既に使われています/);
  });

  it("パスワード変更は他の端末のセッションを無効化する", () => {
    const id = createUser({ email: "session@example.com", role: "general", password: "password123" });
    const db = getDb();
    const insert = db.prepare("INSERT INTO sessions (id, user_id, pending_mfa, created_at, expires_at) VALUES (?, ?, 0, 'x', 'y')");
    insert.run("keep", id);
    insert.run("drop", id);
    changePassword(id, "new-password-1", "keep");
    const ids = (db.prepare("SELECT id FROM sessions WHERE user_id = ?").all(id) as { id: string }[]).map((r) => r.id);
    expect(ids).toEqual(["keep"]);
    expect(loginId("session@example.com", "new-password-1")).toBe(id);
    expect(loginId("session@example.com", "password123")).toBe("invalid");
  });
});

describe("二段階認証", () => {
  it("設定 → パスコード確認 → 有効化、シークレットは暗号化して保存される", () => {
    const id = createUser({ email: "mfa-user@example.com", role: "general", password: "password123" });
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
    const id = createUser({ email: "mfa-login@example.com", role: "general", password: "password123" });
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
