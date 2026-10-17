/** リンク集の、データベースを使わない処理（画面の部品からも使う） */
import { squish } from "./text";

export const BOOKMARK_TITLE_MAX_LENGTH = 200;
export const BOOKMARK_DESCRIPTION_MAX_LENGTH = 10000;
export const BOOKMARK_URL_MAX_LENGTH = 2048;
export const BOOKMARK_TAGS_MAX = 20;
/** 保存するファビコン（data: URI）の上限。一覧で外部へ取りに行かないよう、画像そのものを保存する */
export const FAVICON_MAX_LENGTH = 48 * 1024;

export const BOOKMARK_SORTS = { new: "新着順", updated: "更新順", title: "タイトル順" } as const;
export type BookmarkSort = keyof typeof BOOKMARK_SORTS;
export const isBookmarkSort = (value: string): value is BookmarkSort => value in BOOKMARK_SORTS;

// ---- URL ----

/** http / https の URL として解釈する。不正なら null */
export function parseHttpUrl(value: string): URL | null {
  const text = value.trim();
  if (!text || text.length > BOOKMARK_URL_MAX_LENGTH || /[\s\x00-\x1f]/.test(text)) return null;
  try {
    const url = new URL(text);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

/** 計測用のクエリ（広告の流入元など）。重複判定では無視する */
const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|yclid|mc_cid|mc_eid)$/i;

/**
 * 重複判定に使う URL。次の違いは同じ URL とみなす。
 * - スキーム・ホスト名の大文字小文字、既定のポート番号（URL の標準の正規化）
 * - 末尾のスラッシュ、# 以降（ページ内の位置）
 * - 計測用のクエリ（utm_* など）と、クエリの並び順
 * http と https、www の有無は別の URL として扱う。
 */
export function normalizeUrl(url: URL): string {
  const params = [...url.searchParams].filter(([key]) => !TRACKING_PARAM.test(key)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const search = params.length ? `?${new URLSearchParams(params)}` : "";
  const pathname = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${pathname}${search}`;
}

/** 一覧に表示するドメイン（先頭の www. は省く） */
export const displayDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** 保存してよいファビコンか（ラスター画像の data: URI だけを受け付ける） */
export const isValidFavicon = (value: string): boolean =>
  value.length <= FAVICON_MAX_LENGTH && /^data:image\/(png|gif|jpeg|webp|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/]+=*$/.test(value);

// ---- 説明文 ----

/** Markdown の説明文から、一覧に出すプレーンテキストの抜粋を作る */
export function plainExcerpt(markdown: string, length = 160): string {
  const text = markdown
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_, title: string, _2, label?: string) => label ?? title)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?(<\/\1>|$)/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, "")
    .replace(/[*_~`|]/g, "");
  const flat = squish(text);
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}
