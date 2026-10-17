import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertFetchableUrl, decodeEntities, fetchUrlMetadata, isBlockedAddress, parseHtmlMetadata, UnsafeUrlError } from "@/lib/url-metadata";

describe("SSRF 対策: 接続先の IP アドレス", () => {
  it.each([
    "127.0.0.1",
    "127.1.2.3",
    "0.0.0.0",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "fe80::1",
    "fc00::1",
    "fd12:3456::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:10.0.0.1",
    "64:ff9b::a9fe:a9fe",
    "2002:7f00:0001::1",
    "not-an-ip",
  ])("%s は拒否する", (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])("%s は許可する", (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe("SSRF 対策: URL の検査", () => {
  it.each([
    "http://localhost/",
    "http://LOCALHOST./",
    "http://foo.localhost/",
    "http://printer.local/",
    "http://metadata.google.internal/",
    "http://intranet/",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::ffff:127.0.0.1]/",
    "http://2130706433/",
    "http://0x7f.1/",
    "https://example.com:8443/",
    "http://example.com:22/",
    "file:///etc/passwd",
    "gopher://example.com/",
  ])("%s には接続しない", (url) => {
    expect(() => assertFetchableUrl(url)).toThrow(UnsafeUrlError);
  });

  it("通常の URL は通す", () => {
    expect(assertFetchableUrl("https://example.com/docs").hostname).toBe("example.com");
    expect(assertFetchableUrl("http://example.com:80/").hostname).toBe("example.com");
  });

  describe("ローカルのサーバー", () => {
    let server: http.Server;
    let port = 0;
    beforeAll(async () => {
      server = http.createServer((_req, res) => res.end("<title>secret</title>"));
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      port = (server.address() as AddressInfo).port;
    });
    afterAll(() => server.close());

    it("ループバックのサーバーへは取得しに行かない", async () => {
      await expect(fetchUrlMetadata(`http://127.0.0.1:${port}/`)).rejects.toThrow(UnsafeUrlError);
      await expect(fetchUrlMetadata(`http://localhost:${port}/`)).rejects.toThrow(UnsafeUrlError);
    });
  });
});

describe("HTML の解析", () => {
  const base = new URL("https://example.com/docs/page");

  it("<title> を優先し、なければ og:title を使う。文字参照を戻し、空白を詰める", () => {
    expect(parseHtmlMetadata("<html><head><title>\n  A &amp; B &#x3042;  </title></head></html>", base).title).toBe("A & B あ");
    expect(parseHtmlMetadata('<head><meta property="og:title" content="OG &quot;title&quot;"></head>', base).title).toBe('OG "title"');
    expect(parseHtmlMetadata("<head></head><body><title>body</title></body>", base).title).toBeNull();
  });

  it("ファビコンの候補を相対パスから解決し、SVG は除き、最後に /favicon.ico を足す", () => {
    const html = `<head>
      <link rel="icon" type="image/svg+xml" href="/icon.svg">
      <link rel="apple-touch-icon" href="https://cdn.example.com/apple.png">
      <link rel="shortcut icon" href="img/fav.png">
      <link rel="icon" href="javascript:alert(1)">
    </head>`;
    expect(parseHtmlMetadata(html, base).iconUrls).toEqual(["https://example.com/docs/img/fav.png", "https://cdn.example.com/apple.png", "https://example.com/favicon.ico"]);
    expect(parseHtmlMetadata("<head></head>", base).iconUrls).toEqual(["https://example.com/favicon.ico"]);
  });

  it("文字参照の変換", () => {
    expect(decodeEntities("&lt;b&gt; &#12354; &unknown; &#0;")).toBe("<b> あ &unknown; &#0;");
  });
});
