import { afterEach, describe, expect, it } from "vitest";
import {
  allowLoginAttempt,
  clientIpFrom,
  LOGIN_IP_LIMIT,
  LOGIN_USER_LIMIT,
  LOGIN_USER_LIMIT_WITH_IP,
  resetAttempts,
} from "@/lib/rate-limit";
import { trustProxy } from "@/lib/env";

const headersOf = (init: Record<string, string>) => new Headers(init);

describe("接続元 IP", () => {
  afterEach(() => {
    delete process.env.TRUST_PROXY;
  });

  it("TRUST_PROXY が無ければ X-Forwarded-For を使わない", () => {
    expect(clientIpFrom(headersOf({ "x-forwarded-for": "1.2.3.4" }), false)).toBeNull();
    expect(clientIpFrom(headersOf({ "x-real-ip": "1.2.3.4" }), false)).toBeNull();
  });

  it("TRUST_PROXY=true ならプロキシが追記した右端の値を使う（左側は偽装できる）", () => {
    expect(clientIpFrom(headersOf({ "x-forwarded-for": "6.6.6.6, 203.0.113.5" }), true)).toBe("203.0.113.5");
    expect(clientIpFrom(headersOf({ "x-forwarded-for": " 203.0.113.5 " }), true)).toBe("203.0.113.5");
    expect(clientIpFrom(headersOf({ "x-real-ip": "198.51.100.7" }), true)).toBe("198.51.100.7");
    expect(clientIpFrom(headersOf({}), true)).toBeNull();
  });

  it("環境変数 TRUST_PROXY は true のときだけ有効", () => {
    expect(trustProxy()).toBe(false);
    process.env.TRUST_PROXY = "1";
    expect(trustProxy()).toBe(false);
    process.env.TRUST_PROXY = "true";
    expect(trustProxy()).toBe(true);
  });
});

describe("ログイン試行の制限", () => {
  const at = 1_000_000_000;
  afterEach(() => {
    for (const k of ["login-user:victim@example.com", "login:6.6.6.6", "login:7.7.7.7", "login-user:a@example.com"])
      resetAttempts(k);
  });

  it("IP が分からなければメールアドレス単位で制限する", () => {
    for (let i = 0; i < LOGIN_USER_LIMIT.limit; i++) expect(allowLoginAttempt(null, "victim@example.com", at + i)).toBe(true);
    expect(allowLoginAttempt(null, "victim@example.com", at + 100)).toBe(false);
    expect(allowLoginAttempt(null, "VICTIM@example.com", at + 100)).toBe(false);
    expect(allowLoginAttempt(null, "victim@example.com", at + LOGIN_USER_LIMIT.windowMs + 100)).toBe(true);
  });

  it("IP が分かれば IP 単位で止まり、1 つの IP から他人をロックできない", () => {
    let t = at;
    // 1 つの IP から窓をまたいで試し続けても、IP の上限で止まりメールアドレスの上限には届かない
    for (let w = 0; w * LOGIN_IP_LIMIT.windowMs < LOGIN_USER_LIMIT_WITH_IP.windowMs; w++) {
      t = at + w * (LOGIN_IP_LIMIT.windowMs + 1);
      for (let i = 0; i < LOGIN_IP_LIMIT.limit; i++) expect(allowLoginAttempt("6.6.6.6", "victim@example.com", t + i)).toBe(true);
      expect(allowLoginAttempt("6.6.6.6", "victim@example.com", t + 50)).toBe(false);
    }
    // 本人は別の IP からログインを試せる
    expect(allowLoginAttempt("7.7.7.7", "victim@example.com", t + 60)).toBe(true);
  });

  it("IP が分かっても、多数の IP からの総当たりはメールアドレス単位で止まる", () => {
    for (let i = 0; i < LOGIN_USER_LIMIT_WITH_IP.limit; i++)
      expect(allowLoginAttempt(`10.0.${Math.floor(i / 250)}.${i % 250}`, "a@example.com", at + i)).toBe(true);
    expect(allowLoginAttempt("10.9.9.9", "a@example.com", at + 1000)).toBe(false);
  });
});
