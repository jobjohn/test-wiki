import { createHash } from "node:crypto";
import { all, get, run, transaction } from "./db";
import { defaultAdminPassword } from "./env";
import { ValidationError } from "./errors";
import { hashPassword, verifyDummyPassword, verifyPassword } from "./password";
import { decrypt, encrypt } from "./secret";
import { keyOf, now, squish } from "./text";
import { generateSecret, verifyTotp } from "./totp";

import { ROLES, type Role } from "./roles";

export { ROLES, type Role };
export const BACKUP_CODE_COUNT = 10;
export const DEFAULT_ADMIN_USERNAME = "wikiadmin";

export interface User {
  id: number;
  username: string;
  displayName: string | null;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  mfaEnabledAt: string | null;
  remainingBackupCodes: number;
  lastSignInAt: string | null;
}

interface UserRow {
  id: number;
  username: string;
  display_name: string | null;
  password_hash: string;
  role: Role;
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
    username: row.username,
    displayName: row.display_name,
    name: row.display_name || row.username,
    role: row.role,
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

export function findUserByUsername(username: string): User | undefined {
  const row = get<UserRow>("SELECT * FROM users WHERE username_key = ?", keyOf(username));
  return row && mapUser(row);
}

export function listUsers(): User[] {
  return all<UserRow>("SELECT * FROM users ORDER BY username_key").map(mapUser);
}

export const canEdit = (user: Pick<User, "role"> | null | undefined) => user?.role === "admin" || user?.role === "editor";
export const isAdmin = (user: Pick<User, "role"> | null | undefined) => user?.role === "admin";

/** ユーザーが 1 人もいなければ初期管理者 wikiadmin を作成する */
export function ensureDefaultAdmin() {
  if (get<{ n: number }>("SELECT COUNT(*) AS n FROM users")!.n > 0) return;
  createUser({
    username: DEFAULT_ADMIN_USERNAME,
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

function validateProfile(input: { username?: string; displayName?: string | null; role?: string }, userId?: number): string[] {
  const errors: string[] = [];
  if (input.username !== undefined) {
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(input.username.trim())) {
      errors.push("ユーザー名は半角英数字と _ . - で 3〜32 文字にしてください");
    } else {
      const taken = get<{ id: number }>("SELECT id FROM users WHERE username_key = ?", keyOf(input.username));
      if (taken && taken.id !== userId) errors.push("ユーザー名は既に使われています");
    }
  }
  if (input.displayName && squish(input.displayName).length > 50) errors.push("表示名は 50 文字以内にしてください");
  if (input.role !== undefined && !(input.role in ROLES)) errors.push("権限が不正です");
  return errors;
}

export interface NewUser {
  username: string;
  displayName?: string;
  role: Role;
  password: string;
  passwordConfirmation?: string;
  mustChangePassword?: boolean;
}

export function createUser(input: NewUser): number {
  const errors = [...validateProfile(input), ...validatePassword(input.password, input.passwordConfirmation)];
  if (errors.length) throw new ValidationError(errors);

  const timestamp = now();
  return run(
    `INSERT INTO users (username, username_key, display_name, password_hash, role, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.username.trim(),
    keyOf(input.username),
    input.displayName ? squish(input.displayName) : null,
    hashPassword(input.password),
    input.role,
    input.mustChangePassword ? 1 : 0,
    timestamp,
    timestamp,
  ).lastInsertRowid;
}

function adminCountExcluding(id: number): number {
  return get<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND id != ?", id)!.n;
}

export interface UserUpdate {
  username: string;
  displayName?: string;
  role: Role;
  password?: string;
  passwordConfirmation?: string;
  mustChangePassword?: boolean;
}

export function updateUser(id: number, input: UserUpdate) {
  const existing = rowById(id);
  if (!existing) throw new ValidationError("ユーザーが見つかりません");
  const errors = validateProfile(input, id);
  if (input.password) errors.push(...validatePassword(input.password, input.passwordConfirmation));
  if (existing.role === "admin" && input.role !== "admin" && adminCountExcluding(id) === 0) {
    errors.push("権限を変更できません（管理者が 1 人もいなくなります）");
  }
  if (errors.length) throw new ValidationError(errors);

  transaction(() => {
    run(
      `UPDATE users SET username = ?, username_key = ?, display_name = ?, role = ?, must_change_password = ?, updated_at = ? WHERE id = ?`,
      input.username.trim(),
      keyOf(input.username),
      input.displayName ? squish(input.displayName) : null,
      input.role,
      input.mustChangePassword ? 1 : 0,
      now(),
      id,
    );
    if (input.password) {
      run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(input.password), id);
      run("DELETE FROM sessions WHERE user_id = ?", id);
    }
  });
}

export function updateDisplayName(id: number, displayName: string) {
  const errors = validateProfile({ displayName });
  if (errors.length) throw new ValidationError(errors);
  run("UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?", displayName ? squish(displayName) : null, now(), id);
}

export function deleteUser(id: number) {
  const existing = rowById(id);
  if (!existing) return;
  if (existing.role === "admin" && adminCountExcluding(id) === 0) throw new ValidationError("最後の管理者は削除できません");
  run("DELETE FROM users WHERE id = ?", id);
}

/** ユーザー名とパスワードを照合する（存在しないユーザーでも処理時間を揃える） */
export function authenticate(username: string, password: string): User | undefined {
  const row = get<UserRow>("SELECT * FROM users WHERE username_key = ?", keyOf(username));
  if (!row) return verifyDummyPassword(password) || undefined;
  return verifyPassword(password, row.password_hash) ? mapUser(row) : undefined;
}

export function checkPassword(id: number, password: string): boolean {
  const row = rowById(id);
  return !!row && verifyPassword(password, row.password_hash);
}

/** パスワードを変更し、変更した端末以外のログインを無効化する */
export function changePassword(id: number, newPassword: string, keepSessionId?: string) {
  transaction(() => {
    run(
      "UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?",
      hashPassword(newPassword),
      now(),
      id,
    );
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
  return run("UPDATE users SET otp_backup_codes = ? WHERE id = ? AND otp_backup_codes = ?", JSON.stringify(codes.filter((c) => c !== digest)), id, row.otp_backup_codes).changes === 1;
}
