import { createHash } from "node:crypto";
import { all, get, run, transaction } from "./db";
import { defaultAdminEmail, defaultAdminPassword } from "./env";
import { ValidationError } from "./errors";
import { hashPassword, verifyDummyPassword, verifyPassword } from "./password";
import { decrypt, encrypt } from "./secret";
import { keyOf, now, squish } from "./text";
import { generateSecret, verifyTotp } from "./totp";

import { ROLES, STATUSES, type Role, type Status } from "./roles";

export { ROLES, STATUSES, type Role, type Status };
export const BACKUP_CODE_COUNT = 10;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface User {
  id: number;
  email: string;
  displayName: string | null;
  name: string;
  role: Role;
  status: Status;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  mfaEnabledAt: string | null;
  remainingBackupCodes: number;
  lastSignInAt: string | null;
}

interface UserRow {
  id: number;
  email: string;
  display_name: string | null;
  password_hash: string;
  role: Role;
  status: Status;
  otp_secret: string | null;
  otp_enabled_at: string | null;
  otp_backup_codes: string;
  last_otp_step: number | null;
  must_change_password: number;
  last_sign_in_at: string | null;
}

function mapUser(row: UserRow): User {
  const codes = JSON.parse(row.otp_backup_codes) as string[];
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    name: row.display_name || row.email.split("@")[0],
    role: row.role,
    status: row.status,
    mustChangePassword: !!row.must_change_password,
    mfaEnabled: !!row.otp_enabled_at && !!row.otp_secret,
    mfaEnabledAt: row.otp_enabled_at,
    remainingBackupCodes: codes.length,
    lastSignInAt: row.last_sign_in_at,
  };
}

const rowById = (id: number) => get<UserRow>("SELECT * FROM users WHERE id = ?", id);

export function getUser(id: number): User | undefined {
  const row = rowById(id);
  return row && mapUser(row);
}

export function findUserByEmail(email: string): User | undefined {
  const row = get<UserRow>("SELECT * FROM users WHERE email_key = ?", keyOf(email));
  return row && mapUser(row);
}

export function listUsers(): User[] {
  return all<UserRow>("SELECT * FROM users ORDER BY status = 'disabled', email_key").map(mapUser);
}

const isActive = (user: Pick<User, "status"> | null | undefined) => user?.status === "active";
/** ページの作成・編集ができるか（有効な一般ユーザーと管理者） */
export const canEdit = (user: Pick<User, "role" | "status"> | null | undefined) => isActive(user);
/** ユーザー管理・Wiki の設定ができるか（有効な管理者） */
export const isAdmin = (user: Pick<User, "role" | "status"> | null | undefined) => isActive(user) && user?.role === "admin";

/** ユーザーが 1 人もいなければ初期管理者を作成する */
export function ensureDefaultAdmin() {
  if (get<{ n: number }>("SELECT COUNT(*) AS n FROM users")!.n > 0) return;
  createUser({
    email: defaultAdminEmail(),
    displayName: "Wiki 管理者",
    role: "admin",
    password: defaultAdminPassword(),
    mustChangePassword: true,
  });
}

export function validatePassword(password: string, confirmation?: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push("パスワードは 8 文字以上にしてください");
  if (password.length > 72) errors.push("パスワードは 72 文字以内にしてください");
  if (confirmation !== undefined && password !== confirmation) errors.push("パスワード（確認）が一致しません");
  return errors;
}

function validateProfile(input: { email?: string; displayName?: string | null; role?: string; status?: string }, userId?: number): string[] {
  const errors: string[] = [];
  if (input.email !== undefined) {
    const email = input.email.trim();
    if (!EMAIL_FORMAT.test(email) || email.length > 254) {
      errors.push("メールアドレスの形式が正しくありません");
    } else {
      const taken = get<{ id: number }>("SELECT id FROM users WHERE email_key = ?", keyOf(email));
      if (taken && taken.id !== userId) errors.push("このメールアドレスは既に使われています");
    }
  }
  if (input.displayName && squish(input.displayName).length > 50) errors.push("表示名は 50 文字以内にしてください");
  if (input.role !== undefined && !(input.role in ROLES)) errors.push("ロールが不正です");
  if (input.status !== undefined && !(input.status in STATUSES)) errors.push("ステータスが不正です");
  return errors;
}

export interface NewUser {
  email: string;
  displayName?: string;
  role: Role;
  status?: Status;
  password: string;
  passwordConfirmation?: string;
  mustChangePassword?: boolean;
}

export function createUser(input: NewUser): number {
  const errors = [...validateProfile(input), ...validatePassword(input.password, input.passwordConfirmation)];
  if (errors.length) throw new ValidationError(errors);

  const timestamp = now();
  return run(
    `INSERT INTO users (email, email_key, display_name, password_hash, role, status, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.email.trim(),
    keyOf(input.email),
    input.displayName ? squish(input.displayName) : null,
    hashPassword(input.password),
    input.role,
    input.status ?? "active",
    input.mustChangePassword ? 1 : 0,
    timestamp,
    timestamp,
  ).lastInsertRowid;
}

/** 自分以外の、有効な管理者の数 */
function adminCountExcluding(id: number): number {
  return get<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active' AND id != ?", id)!.n;
}

export interface UserUpdate {
  email: string;
  displayName?: string;
  role: Role;
  status: Status;
  password?: string;
  passwordConfirmation?: string;
  mustChangePassword?: boolean;
}

export function updateUser(id: number, input: UserUpdate) {
  const existing = rowById(id);
  if (!existing) throw new ValidationError("ユーザーが見つかりません");
  const errors = validateProfile(input, id);
  if (input.password) errors.push(...validatePassword(input.password, input.passwordConfirmation));
  const wasActiveAdmin = existing.role === "admin" && existing.status === "active";
  const staysActiveAdmin = input.role === "admin" && input.status === "active";
  if (wasActiveAdmin && !staysActiveAdmin && adminCountExcluding(id) === 0) {
    errors.push("ロールまたはステータスを変更できません（有効な管理者が 1 人もいなくなります）");
  }
  if (errors.length) throw new ValidationError(errors);

  transaction(() => {
    run(
      `UPDATE users SET email = ?, email_key = ?, display_name = ?, role = ?, status = ?, must_change_password = ?, updated_at = ? WHERE id = ?`,
      input.email.trim(),
      keyOf(input.email),
      input.displayName ? squish(input.displayName) : null,
      input.role,
      input.status,
      input.mustChangePassword ? 1 : 0,
      now(),
      id,
    );
    // 無効にしたら、ログイン中の端末からもログアウトさせる
    if (input.status === "disabled") run("DELETE FROM sessions WHERE user_id = ?", id);
    if (input.password) {
      run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(input.password), id);
      run("DELETE FROM sessions WHERE user_id = ?", id);
    }
  });
}

/** 本人によるプロフィール（メールアドレス・表示名）の変更 */
export function updateProfile(id: number, input: { email: string; displayName: string }) {
  const errors = validateProfile(input, id);
  if (errors.length) throw new ValidationError(errors);
  run(
    "UPDATE users SET email = ?, email_key = ?, display_name = ?, updated_at = ? WHERE id = ?",
    input.email.trim(),
    keyOf(input.email),
    input.displayName ? squish(input.displayName) : null,
    now(),
    id,
  );
}

export function deleteUser(id: number) {
  const existing = rowById(id);
  if (!existing) return;
  if (existing.role === "admin" && existing.status === "active" && adminCountExcluding(id) === 0) {
    throw new ValidationError("最後の有効な管理者は削除できません");
  }
  run("DELETE FROM users WHERE id = ?", id);
}

/**
 * メールアドレスとパスワードを照合する（存在しないユーザーでも処理時間を揃える）。
 * 無効なユーザーは、パスワードが正しくてもログインさせない。
 */
export function authenticate(email: string, password: string): { user: User } | { error: "invalid" | "disabled" } {
  const row = get<UserRow>("SELECT * FROM users WHERE email_key = ?", keyOf(email));
  if (!row) {
    verifyDummyPassword(password);
    return { error: "invalid" };
  }
  if (!verifyPassword(password, row.password_hash)) return { error: "invalid" };
  if (row.status !== "active") return { error: "disabled" };
  return { user: mapUser(row) };
}

export function checkPassword(id: number, password: string): boolean {
  const row = rowById(id);
  return !!row && verifyPassword(password, row.password_hash);
}

/** パスワードを変更し、変更した端末以外のログインを無効化する */
export function changePassword(id: number, newPassword: string, keepSessionId?: string) {
  transaction(() => {
    run("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?", hashPassword(newPassword), now(), id);
    run("DELETE FROM sessions WHERE user_id = ? AND id != ?", id, keepSessionId ?? "");
  });
}

export function touchSignIn(id: number) {
  run("UPDATE users SET last_sign_in_at = ? WHERE id = ?", now(), id);
}

// ---- 二段階認証（認証アプリのパスコード） ----

const digestCode = (code: string) => createHash("sha256").update(normalizeCode(code).toLowerCase()).digest("hex");
export const normalizeCode = (code: string) => code.replace(/[\s-]/g, "");

function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const raw = Array.from(bytes, (b) => chars[b % chars.length]).join("");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

/** 設定中（未確認）の MFA シークレット。なければ作成して保存する（確認が済むまで MFA は有効にならない） */
export function pendingMfaSecret(id: number): string {
  const row = rowById(id);
  if (!row) throw new ValidationError("ユーザーが見つかりません");
  if (row.otp_secret && !row.otp_enabled_at) return decrypt(row.otp_secret);
  const secret = generateSecret();
  run("UPDATE users SET otp_secret = ?, otp_enabled_at = NULL, updated_at = ? WHERE id = ?", encrypt(secret), now(), id);
  return secret;
}

/** 認証アプリのパスコードを確認できたら MFA を有効化し、表示用のバックアップコードを返す（不一致は null） */
export function confirmMfa(id: number, code: string): string[] | null {
  const row = rowById(id);
  if (!row?.otp_secret || row.otp_enabled_at) return null;
  const step = verifyTotp(decrypt(row.otp_secret), normalizeCode(code));
  if (step === null) return null;
  return enableMfa(id, decrypt(row.otp_secret), step);
}

/** シークレットを保存して MFA を有効化し、表示用のバックアップコードを返す */
export function enableMfa(id: number, secret: string, usedStep: number | null = null): string[] {
  const codes = generateBackupCodes();
  run(
    `UPDATE users SET otp_secret = ?, otp_enabled_at = ?, last_otp_step = ?, otp_backup_codes = ?, updated_at = ? WHERE id = ?`,
    encrypt(secret),
    now(),
    usedStep,
    JSON.stringify(codes.map(digestCode)),
    now(),
    id,
  );
  return codes;
}

export function disableMfa(id: number) {
  run(
    "UPDATE users SET otp_secret = NULL, otp_enabled_at = NULL, otp_backup_codes = '[]', last_otp_step = NULL, updated_at = ? WHERE id = ?",
    now(),
    id,
  );
}

export function regenerateBackupCodes(id: number): string[] {
  const codes = generateBackupCodes();
  run("UPDATE users SET otp_backup_codes = ?, updated_at = ? WHERE id = ?", JSON.stringify(codes.map(digestCode)), now(), id);
  return codes;
}

/** パスコードまたはバックアップコードを検証する（同じパスコードの再利用・バックアップコードの再使用は拒否） */
export function verifyMfaCode(id: number, input: string): boolean {
  const row = rowById(id);
  if (!row?.otp_secret || !row.otp_enabled_at) return false;

  const code = normalizeCode(input);
  if (/^\d{6}$/.test(code)) {
    const step = verifyTotp(decrypt(row.otp_secret), code, row.last_otp_step ?? -1);
    if (step === null) return false;
    // 同時に同じコードが使われても片方だけが成功するよう、更新の可否で判定する
    return run("UPDATE users SET last_otp_step = ? WHERE id = ? AND (last_otp_step IS NULL OR last_otp_step < ?)", step, id, step).changes === 1;
  }

  const digest = digestCode(code);
  const codes = JSON.parse(row.otp_backup_codes) as string[];
  if (!codes.includes(digest)) return false;
  return (
    run(
      "UPDATE users SET otp_backup_codes = ? WHERE id = ? AND otp_backup_codes = ?",
      JSON.stringify(codes.filter((c) => c !== digest)),
      id,
      row.otp_backup_codes,
    ).changes === 1
  );
}
