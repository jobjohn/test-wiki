export interface TocItem {
  id: string;
  text: string;
  level: number;
}

const HEADING = /<h([1-3])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** 描画済み HTML の h1〜h3（rehype-slug の id）から目次の項目を取り出す */
export function extractToc(html: string): TocItem[] {
  const items: TocItem[] = [];
  for (const match of html.matchAll(HEADING)) {
    const id = /\sid="([^"]*)"/.exec(match[2])?.[1];
    if (!id) continue;
    const text = decodeHtml(match[3].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (!text) continue;
    items.push({ id: decodeHtml(id), text, level: Number(match[1]) });
  }
  return items;
}
