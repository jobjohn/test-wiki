import { headers } from "next/headers";
import { trustProxy } from "./env";
import { keyOf } from "./text";

const buckets = new Map<string, number[]>();

/**
 * 接続元 IP（信頼できる場合だけ）。
 * X-Forwarded-For は利用者が自由に付けられるため、TRUST_PROXY=true のときだけ使う。
 * その場合も、手前のリバースプロキシが末尾に追記した値（右端）を採用する（左側は利用者が偽装できる）。
 * 信頼しない場合は null（IP 単位の制限はかけない）。
 */
export function clientIpFrom(h: Pick<Headers, "get">, trusted = trustProxy()): string | null {
  if (!trusted) return null;
  const forwarded = h.get("x-forwarded-for")?.split(",").map((v) => v.trim()).filter(Boolean);
  return forwarded?.at(-1) || h.get("x-real-ip")?.trim() || null;
}

export async function clientIp(): Promise<string | null> {
  return clientIpFrom(await headers());
}

export const LOGIN_IP_LIMIT = { limit: 10, windowMs: 3 * 60_000 };
/** IP が分かるときのメールアドレス単位の上限。1 つの IP からの上限（10 分で約 40 回）より大きくし、単独の攻撃者に他人をロックさせない */
export const LOGIN_USER_LIMIT_WITH_IP = { limit: 60, windowMs: 10 * 60_000 };
/** IP が分からないときのメールアドレス単位の上限（総当たり対策の最後の砦） */
export const LOGIN_USER_LIMIT = { limit: 20, windowMs: 10 * 60_000 };

/** ログイン試行を許可するか。IP が信頼できればまず IP 単位で制限し、メールアドレス単位の制限はゆるめる */
export function allowLoginAttempt(ip: string | null, email: string, at = Date.now()): boolean {
  const user = `login-user:${keyOf(email)}`;
  if (ip === null) return allowAttempt(user, LOGIN_USER_LIMIT.limit, LOGIN_USER_LIMIT.windowMs, at);
  return (
    allowAttempt(`login:${ip}`, LOGIN_IP_LIMIT.limit, LOGIN_IP_LIMIT.windowMs, at) &&
    allowAttempt(user, LOGIN_USER_LIMIT_WITH_IP.limit, LOGIN_USER_LIMIT_WITH_IP.windowMs, at)
  );
}

/** 一定時間内の試行回数を制限する（メモリ内・プロセス単位）。超過したら false */
export function allowAttempt(key: string, limit: number, windowMs: number, at = Date.now()): boolean {
  const recent = (buckets.get(key) ?? []).filter((t) => t > at - windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(at);
  buckets.set(key, recent);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.every((t) => t <= at - windowMs)) buckets.delete(k);
  return true;
}

export function resetAttempts(key: string) {
  buckets.delete(key);
}
