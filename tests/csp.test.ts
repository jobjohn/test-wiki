import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, createNonce, isCspExempt } from "@/lib/csp";

describe("Content-Security-Policy", () => {
  it("nonce は毎回異なる", () => {
    expect(createNonce()).not.toBe(createNonce());
  });

  it("スクリプトは nonce 付きのものだけ許可し、本番では eval を許さない", () => {
    const csp = contentSecurityPolicy("abc");
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("開発時は eval、HTTPS のときは upgrade-insecure-requests を加える", () => {
    expect(contentSecurityPolicy("abc", { dev: true })).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy("abc", { https: true })).toContain("upgrade-insecure-requests");
  });

  it("API・ファイル配信・死活監視は対象外", () => {
    expect(isCspExempt("/api/mcp")).toBe(true);
    expect(isCspExempt("/files/1/a.png")).toBe(true);
    expect(isCspExempt("/up")).toBe(true);
    expect(isCspExempt("/uploads")).toBe(false);
    expect(isCspExempt("/pages/1")).toBe(false);
  });
});
