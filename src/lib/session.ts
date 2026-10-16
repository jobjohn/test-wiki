import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { get, run } from "./db";
import { isSecure } from "./env";
import { getUser, touchSignIn, type User } from "./users";

const COOKIE = "wiki_session";
const SESSION_DAYS = 14;
const MFA_PENDING_MINUTES = 10;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

interface SessionRow {
  id: string;
  user_id: number;
  pending_mfa: number;
  expires_at: string;
}

function cookieOptions(expires: Date) {
  return { httpOnly: true, sameSite: "lax" as const, secure: isSecure(), path: "/", expires };
}

/** ログインセッションを発行する。MFA が必要な場合は pending にして、パスコード確認後に昇格させる */
export async function startSession(userId: number, options: { pendingMfa?: boolean } = {}) {
  await endSession();
  const token = randomBytes(32).toString("base64url");
  const ttl = options.pendingMfa ? MFA_PENDING_MINUTES * 60_000 : SESSION_DAYS * 86_400_000;
  const expires = new Date(Date.now() + ttl);
  run(
    "INSERT INTO sessions (id, user_id, pending_mfa, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
    hashToken(token),
    userId,
    options.pendingMfa ? 1 : 0,
    new Date().toISOString(),
    expires.toISOString(),
  );
  run("DELETE FROM sessions WHERE expires_at < ?", new Date().toISOString());
  (await cookies()).set(COOKIE, token, cookieOptions(expires));
  if (!options.pendingMfa) touchSignIn(userId);
}

/** パスコード確認後にセッションを通常のログイン状態にする（セッション ID も作り直す） */
export async function promoteSession(userId: number) {
  await startSession(userId);
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) run("DELETE FROM sessions WHERE id = ?", hashToken(token));
  jar.delete(COOKIE);
}

async function loadSession(): Promise<SessionRow | undefined> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return undefined;
  const row = get<SessionRow>("SELECT * FROM sessions WHERE id = ?", hashToken(token));
  if (!row) return undefined;
  if (row.expires_at < new Date().toISOString()) {
    run("DELETE FROM sessions WHERE id = ?", row.id);
    return undefined;
  }
  return row;
}

/** ログイン済みのユーザー（MFA の確認待ちは含まない） */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await loadSession();
  if (!session || session.pending_mfa) return null;
  return getUser(session.user_id) ?? null;
});

/** パスワード確認済みで、MFA のパスコード入力待ちのユーザー */
export async function getPendingMfaUser(): Promise<User | null> {
  const session = await loadSession();
  if (!session || !session.pending_mfa) return null;
  return getUser(session.user_id) ?? null;
}

export async function currentSessionId(): Promise<string | undefined> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? hashToken(token) : undefined;
}
