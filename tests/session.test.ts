import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { get, getDb, run } from "@/lib/db";
import { getCurrentUser, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, SESSION_TOUCH_INTERVAL_MS, slidingExpiry, startSession } from "@/lib/session";
import { updateSettings } from "@/lib/settings";
import { createUser } from "@/lib/users";

// Cookie はメモリ上の入れ物で代用する
const jar = new Map<string, { value: string; expires?: Date }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    set: (name: string, value: string, options: { expires?: Date }) => jar.set(name, { value, expires: options.expires }),
    delete: (name: string) => jar.delete(name),
  }),
}));

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const T0 = Date.parse("2026-01-01T00:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

type Row = { created_at: string; expires_at: string; last_seen_at: string | null };
const latest = () => get<Row>("SELECT created_at, expires_at, last_seen_at FROM sessions ORDER BY created_at DESC, rowid DESC LIMIT 1")!;

let userId: number;
beforeAll(() => {
  getDb();
  updateSettings({ wikiName: "Wiki", description: "" }, { completeSetup: true });
  userId = createUser({ email: "session@example.com", displayName: "セッション", role: "general", password: "password123" });
});
beforeEach(() => {
  run("DELETE FROM sessions");
});
afterEach(() => {
  vi.useRealTimers();
  jar.clear();
});

describe("slidingExpiry", () => {
  const row = { pending_mfa: 0, created_at: iso(T0), last_seen_at: iso(T0) };

  it("前回の記録から 1 時間経つまでは書き込まない", () => {
    expect(slidingExpiry(row, T0 + SESSION_TOUCH_INTERVAL_MS - 1)).toBeNull();
    expect(slidingExpiry(row, T0 + SESSION_TOUCH_INTERVAL_MS)).toBe(iso(T0 + SESSION_TOUCH_INTERVAL_MS + SESSION_IDLE_MS));
  });

  it("ログインから 30 日を超えては延ばさない", () => {
    expect(slidingExpiry(row, T0 + 20 * DAY)).toBe(iso(T0 + SESSION_ABSOLUTE_MS));
  });

  it("last_seen_at がない既存のセッションは created_at を基準にする。MFA の確認待ちは延ばさない", () => {
    expect(slidingExpiry({ ...row, last_seen_at: null }, T0 + 30 * 60_000)).toBeNull();
    expect(slidingExpiry({ ...row, last_seen_at: null }, T0 + 2 * DAY)).toBe(iso(T0 + 16 * DAY));
    expect(slidingExpiry({ ...row, pending_mfa: 1 }, T0 + 2 * DAY)).toBeNull();
  });
});

describe("使っている間は延びるセッション", () => {
  it("ログイン時は 14 日後に切れる。Cookie は 30 日持たせる", async () => {
    vi.useFakeTimers({ now: T0, toFake: ["Date"] });
    await startSession(userId);
    expect(latest()).toEqual({ created_at: iso(T0), expires_at: iso(T0 + SESSION_IDLE_MS), last_seen_at: iso(T0) });
    expect(jar.get("wiki_session")?.expires?.getTime()).toBe(T0 + SESSION_ABSOLUTE_MS);
  });

  it("使うたびに（1 時間に 1 回まで）延び、14 日使わないと切れる", async () => {
    vi.useFakeTimers({ now: T0, toFake: ["Date"] });
    await startSession(userId);

    vi.setSystemTime(T0 + 10 * 60_000);
    expect((await getCurrentUser())?.id).toBe(userId);
    expect(latest().last_seen_at).toBe(iso(T0)); // 1 時間以内は書き込まない

    vi.setSystemTime(T0 + 10 * DAY);
    expect((await getCurrentUser())?.id).toBe(userId);
    expect(latest()).toMatchObject({ last_seen_at: iso(T0 + 10 * DAY), expires_at: iso(T0 + 24 * DAY) });

    vi.setSystemTime(T0 + 24 * DAY + 1);
    expect(await getCurrentUser()).toBeNull();
    expect(get("SELECT 1 FROM sessions WHERE created_at = ?", iso(T0))).toBeUndefined();
  });

  it("使い続けても、ログインから 30 日で切れる", async () => {
    vi.useFakeTimers({ now: T0, toFake: ["Date"] });
    await startSession(userId);
    for (let day = 5; day <= 30; day += 5) {
      vi.setSystemTime(T0 + day * DAY);
      expect((await getCurrentUser())?.id, `${day} 日目`).toBe(userId);
    }
    expect(latest().expires_at).toBe(iso(T0 + SESSION_ABSOLUTE_MS));
    vi.setSystemTime(T0 + SESSION_ABSOLUTE_MS + 1);
    expect(await getCurrentUser()).toBeNull();
  });

  it("移行前からある（last_seen_at のない）セッションもそのまま使え、延長される", async () => {
    vi.useFakeTimers({ now: T0 + 3 * DAY, toFake: ["Date"] });
    await startSession(userId);
    run("UPDATE sessions SET created_at = ?, expires_at = ?, last_seen_at = NULL WHERE created_at = ?", iso(T0), iso(T0 + 14 * DAY), iso(T0 + 3 * DAY));
    expect((await getCurrentUser())?.id).toBe(userId);
    expect(latest()).toMatchObject({ created_at: iso(T0), last_seen_at: iso(T0 + 3 * DAY), expires_at: iso(T0 + 17 * DAY) });
  });
});
