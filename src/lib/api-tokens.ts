import { createHash, randomBytes } from "node:crypto";
import { all, get, run, transaction } from "./db";
import { ValidationError } from "./errors";
import { pendingRequirement } from "./access";
import { getSettings } from "./settings";
import { squish } from "./text";
import { getUser, type User } from "./users";
import {
  type ApiTokenSummary,
  isTokenExpiry,
  TOKEN_EXPIRIES,
  TOKEN_LIMIT_PER_USER,
  TOKEN_NAME_MAX_LENGTH,
  type TokenExpiry,
} from "./api-token-options";

export * from "./api-token-options";

const TOKEN_PREFIX = "wiki_";
/** 最終使用日時を書き込む間隔（書き込みを減らすため） */
const TOUCH_INTERVAL_MS = 60_000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

interface TokenRow {
  id: number;
  user_id: number;
  name: string;
  token_hash: string;
  token_prefix: string;
  scope: string;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

const summarize = (row: TokenRow): ApiTokenSummary => ({
  id: row.id,
  name: row.name,
  prefix: row.token_prefix,
  scope: row.scope,
  expiresAt: row.expires_at,
  lastUsedAt: row.last_used_at,
  createdAt: row.created_at,
});

/** 自分のトークン一覧（新しい順）。ハッシュは返さない */
export const listApiTokens = (userId: number): ApiTokenSummary[] =>
  all<TokenRow>("SELECT * FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC, id DESC", userId).map(summarize);

/**
 * トークンを発行する。平文はこの戻り値でしか得られない（DB にはハッシュだけを保存する）。
 */
export function createApiToken(userId: number, input: { name: string; expiry?: string }, at = new Date()): { token: string; summary: ApiTokenSummary } {
  const name = squish(input.name);
  const expiry = input.expiry ?? "90";
  const errors: string[] = [];
  if (!name) errors.push("名前を入力してください");
  if (name.length > TOKEN_NAME_MAX_LENGTH) errors.push(`名前は ${TOKEN_NAME_MAX_LENGTH} 文字以内にしてください`);
  if (!isTokenExpiry(expiry)) errors.push("有効期限が不正です");
  if (errors.length) throw new ValidationError(errors);

  const days = TOKEN_EXPIRIES[expiry as TokenExpiry].days;
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  return transaction(() => {
    const count = get<{ n: number }>("SELECT COUNT(*) AS n FROM api_tokens WHERE user_id = ?", userId)!.n;
    if (count >= TOKEN_LIMIT_PER_USER) {
      throw new ValidationError(`トークンは 1 人あたり ${TOKEN_LIMIT_PER_USER} 個までです。使っていないトークンを取り消してください`);
    }
    const id = run(
      `INSERT INTO api_tokens (user_id, name, token_hash, token_prefix, scope, expires_at, created_at) VALUES (?, ?, ?, ?, 'read', ?, ?)`,
      userId,
      name,
      hashToken(token),
      token.slice(0, TOKEN_PREFIX.length + 4),
      days === null ? null : new Date(at.getTime() + days * 86_400_000).toISOString(),
      at.toISOString(),
    ).lastInsertRowid;
    return { token, summary: summarize(get<TokenRow>("SELECT * FROM api_tokens WHERE id = ?", id)!) };
  });
}

/** 本人のトークンだけを取り消す。取り消せたら true */
export function revokeApiToken(userId: number, tokenId: number): boolean {
  return run("DELETE FROM api_tokens WHERE id = ? AND user_id = ?", tokenId, userId).changes > 0;
}

export interface VerifiedToken {
  user: User;
  tokenId: number;
  scope: string;
}

/**
 * `Authorization: Bearer` の値からユーザーを特定する。次の場合は null:
 * 存在しない・期限切れ・ユーザーが無効・必須の手続き（MFA 設定・パスワード変更・初期設定）が未完了。
 * 照合はハッシュで行い、平文は保存しない。
 */
export function verifyApiToken(token: string, at = new Date()): VerifiedToken | null {
  if (!token.startsWith(TOKEN_PREFIX) || token.length > 200) return null;
  const row = get<TokenRow>("SELECT * FROM api_tokens WHERE token_hash = ?", hashToken(token));
  if (!row) return null;
  if (row.expires_at && row.expires_at <= at.toISOString()) return null;

  const user = getUser(row.user_id);
  if (!user || user.status !== "active") return null;
  if (pendingRequirement(user, getSettings())) return null;

  if (!row.last_used_at || at.getTime() - new Date(row.last_used_at).getTime() >= TOUCH_INTERVAL_MS) {
    run("UPDATE api_tokens SET last_used_at = ? WHERE id = ?", at.toISOString(), row.id);
  }
  return { user, tokenId: row.id, scope: row.scope };
}

/** `Authorization` ヘッダーから Bearer トークンを取り出す */
export function bearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}
