import { headers } from "next/headers";

const buckets = new Map<string, number[]>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
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
