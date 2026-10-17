import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { FAVICON_MAX_LENGTH, parseHttpUrl } from "./bookmark-utils";
import { squish } from "./text";

/**
 * 外部サイトのメタデータ（タイトル・ファビコン）を取得する。
 * サーバーから任意の URL へアクセスするため、社内ネットワークへの踏み台（SSRF）にならないよう次を守る。
 * - http / https、既定のポート（80 / 443）だけ
 * - 接続先の IP アドレスを、接続する直前（名前解決の結果）に検査する。localhost・プライベート・リンクローカルなどは拒否
 *   （検査した結果にそのまま接続するので、名前解決の結果をすり替える DNS リバインディングも防げる）
 * - リダイレクトは自分でたどり、移動先も同じ検査を行う（回数に上限）
 * - タイムアウトと、読み込むサイズの上限
 */

const TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const USER_AGENT = "Mozilla/5.0 (compatible; WikiLinkPreview/1.0)";

export class UnsafeUrlError extends Error {}

// ---- 接続先の検査 ----

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

/** IPv6 を 8 個の 16 ビット値に展開する */
function expandIpv6(ip: string): number[] | null {
  let address = ip.split("%")[0];
  // 末尾が IPv4 表記（::ffff:1.2.3.4 など）なら 16 進に直す
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  if (v4) {
    const n = ipv4ToInt(v4[1]);
    address = address.slice(0, -v4[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = address.split("::");
  const parse = (part: string | undefined) => (part ? part.split(":").map((h) => parseInt(h, 16)) : []);
  const front = parse(head);
  const back = address.includes("::") ? parse(tail) : [];
  const groups = address.includes("::") ? [...front, ...Array(8 - front.length - back.length).fill(0), ...back] : front;
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

function isBlockedIpv6(ip: string): boolean {
  const g = expandIpv6(ip);
  if (!g) return true;
  const embeddedV4 = () => `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
  if (g.every((x) => x === 0)) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return isBlockedIpv4(embeddedV4()); // ::ffff:0:0/96
  if (g.slice(0, 6).every((x) => x === 0)) return true; // ::/96（廃止された IPv4 互換）
  if (g[0] === 0x64 && g[1] === 0xff9b) return isBlockedIpv4(embeddedV4()); // 64:ff9b::/96（NAT64）
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7（ユニークローカル）
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10（リンクローカル）
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10（サイトローカル）
  if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8（マルチキャスト）
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // 2001:db8::/32（文書用）
  if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true; // 100::/64（破棄用）
  if (g[0] === 0x2002) return isBlockedIpv4(`${g[1] >> 8}.${g[1] & 0xff}.${g[2] >> 8}.${g[2] & 0xff}`); // 6to4
  return false;
}

/** 接続してはいけない IP アドレスか（localhost・プライベート・リンクローカル・予約済みなど） */
export function isBlockedAddress(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true;
}

/** 取得してよい URL か（スキーム・ポート・ホスト名の検査）。IP アドレスの検査は接続時に行う */
export function assertFetchableUrl(value: string): URL {
  const url = parseHttpUrl(value);
  if (!url) throw new UnsafeUrlError("http / https の URL ではありません");
  if (url.port && url.port !== (url.protocol === "https:" ? "443" : "80")) throw new UnsafeUrlError("既定以外のポートには接続しません");
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.+$/, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || (!host.includes(".") && !net.isIP(host))) {
    throw new UnsafeUrlError("内部向けのホスト名には接続しません");
  }
  // IP アドレスを直接書いた URL は名前解決を通らないため、ここで検査する
  if (net.isIP(host) && isBlockedAddress(host)) throw new UnsafeUrlError("内部ネットワークのアドレスには接続しません");
  return url;
}

/** 名前解決の結果を検査してから接続させる（http.request の lookup に渡す） */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const list = addresses as dns.LookupAddress[];
    const blocked = list.find((a) => isBlockedAddress(a.address));
    if (!list.length || blocked) return callback(new UnsafeUrlError("内部ネットワークのアドレスには接続しません"), "", 0);
    if ((options as dns.LookupOptions).all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

// ---- 取得 ----

interface FetchResult {
  url: URL;
  contentType: string;
  body: Buffer;
}

function requestOnce(url: URL, maxBytes: number, signal: AbortSignal, accept: string): Promise<{ status: number; location?: string; contentType: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        signal,
        headers: { "User-Agent": USER_AGENT, Accept: accept, "Accept-Language": "ja,en;q=0.8", "Accept-Encoding": "identity" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers["content-type"] ?? "");
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location, contentType, body: Buffer.alloc(0) });
        }
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > maxBytes && !accept.startsWith("text/html")) {
          res.destroy();
          return reject(new Error("too large"));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            // HTML は先頭（<head>）だけ読めば足りるので、上限で打ち切って続ける。画像は上限を超えたら使わない
            chunks.push(chunk.subarray(0, chunk.length - (size - maxBytes)));
            res.destroy();
            if (accept.startsWith("text/html")) resolve({ status, contentType, body: Buffer.concat(chunks) });
            else reject(new Error("too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ status, contentType, body: Buffer.concat(chunks) }));
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

/** リダイレクトを安全にたどって取得する */
async function safeFetch(start: string, maxBytes: number, signal: AbortSignal, accept: string): Promise<FetchResult> {
  let url = assertFetchableUrl(start);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await requestOnce(url, maxBytes, signal, accept);
    if (res.status >= 300 && res.status < 400) {
      if (!res.location) throw new Error("redirect without location");
      url = assertFetchableUrl(new URL(res.location, url).href);
      continue;
    }
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
    return { url, contentType: res.contentType, body: res.body };
  }
  throw new Error("too many redirects");
}

// ---- HTML の解析 ----

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function attributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) attrs[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? "");
  return attrs;
}

function decodeHtml(body: Buffer, contentType: string): string {
  const fromHeader = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  const head = body.subarray(0, 4096).toString("latin1");
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  for (const label of [fromHeader, fromMeta, "utf-8"]) {
    if (!label) continue;
    try {
      return new TextDecoder(label).decode(body);
    } catch {
      // 未対応の文字コードは次の候補へ
    }
  }
  return body.toString("utf8");
}

/** HTML からタイトルと、ファビコンの候補（優先順）を取り出す */
export function parseHtmlMetadata(html: string, baseUrl: URL): { title: string | null; iconUrls: string[] } {
  const head = html.slice(0, html.search(/<\/head>/i) >= 0 ? html.search(/<\/head>/i) : html.length);
  let ogTitle: string | null = null;
  let siteName: string | null = null;
  const icons: { href: string; rank: number }[] = [];
  for (const m of head.matchAll(/<(meta|link)\b[^>]*>/gi)) {
    const attrs = attributes(m[0]);
    if (m[1].toLowerCase() === "meta") {
      const key = (attrs.property ?? attrs.name ?? "").toLowerCase();
      if (key === "og:title" && attrs.content) ogTitle = attrs.content;
      if (key === "og:site_name" && attrs.content) siteName = attrs.content;
    } else if (attrs.href) {
      const rel = (attrs.rel ?? "").toLowerCase().split(/\s+/);
      // SVG は保存しない（スクリプトを含み得る）ので候補にしない
      if (/\.svg($|\?)/i.test(attrs.href) || attrs.type === "image/svg+xml") continue;
      if (rel.includes("icon")) icons.push({ href: attrs.href, rank: 1 });
      else if (rel.includes("apple-touch-icon")) icons.push({ href: attrs.href, rank: 2 });
    }
  }
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1];
  const raw = titleTag ? decodeEntities(titleTag) : (ogTitle ?? siteName);
  const title = raw ? squish(raw).slice(0, 200) || null : null;

  const iconUrls: string[] = [];
  for (const icon of icons.sort((a, b) => a.rank - b.rank)) {
    try {
      const resolved = new URL(icon.href, baseUrl);
      if ((resolved.protocol === "http:" || resolved.protocol === "https:") && !iconUrls.includes(resolved.href)) iconUrls.push(resolved.href);
    } catch {
      // 解釈できない href は無視する
    }
  }
  const fallback = new URL("/favicon.ico", baseUrl).href;
  if (!iconUrls.includes(fallback)) iconUrls.push(fallback);
  return { title, iconUrls: iconUrls.slice(0, 3) };
}

/** 画像の先頭のバイト列から種類を判定する（Content-Type は信用しない）。対応する画像でなければ null */
function sniffImage(body: Buffer): string | null {
  if (body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (body.subarray(0, 3).toString("latin1") === "GIF") return "image/gif";
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "image/jpeg";
  if (body.subarray(0, 4).toString("latin1") === "RIFF" && body.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (body[0] === 0 && body[1] === 0 && body[2] === 1 && body[3] === 0) return "image/x-icon";
  return null;
}

export interface UrlMetadata {
  title: string | null;
  /** ファビコン（data: URI）。取得できなければ null */
  favicon: string | null;
}

/** タイトルとファビコンを取得する。取得できない・安全でない URL は例外 */
export async function fetchUrlMetadata(value: string): Promise<UrlMetadata> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const page = await safeFetch(value, MAX_HTML_BYTES, signal, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1");
  const isHtml = /text\/html|application\/xhtml\+xml/i.test(page.contentType) || (!page.contentType && /<html/i.test(page.body.subarray(0, 1024).toString("latin1")));
  const { title, iconUrls } = isHtml
    ? parseHtmlMetadata(decodeHtml(page.body, page.contentType), page.url)
    : { title: null, iconUrls: [new URL("/favicon.ico", page.url).href] };

  let favicon: string | null = null;
  for (const iconUrl of iconUrls) {
    try {
      // base64 にすると 4/3 倍になるため、保存できる大きさに収まる画像だけを読む
      const icon = await safeFetch(iconUrl, Math.floor((FAVICON_MAX_LENGTH - 64) * 0.75), signal, "image/*");
      const type = sniffImage(icon.body);
      if (type) {
        favicon = `data:${type};base64,${icon.body.toString("base64")}`;
        break;
      }
    } catch {
      // ファビコンは取れなくてもよい（次の候補へ）
      if (signal.aborted) break;
    }
  }
  return { title, favicon };
}
