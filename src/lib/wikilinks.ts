/** [[ページ名]] / [[ページ名|表示名]] */
export const WIKI_LINK = /\[\[([^\[\]|\n]+?)(?:\|([^\[\]\n]+?))?\]\]/g;

// フェンスドコードブロックとインラインコードは Wiki リンクの対象外
const CODE = /(^(?:```|~~~)[^\n]*\n[\s\S]*?^(?:```|~~~)[ \t]*$|`[^`\n]+`)/m;

/** 本文中の Wiki リンク先ページ名（コード内を除く・重複なし） */
export function extractWikiLinkTitles(text: string): string[] {
  const titles = new Set<string>();
  text.split(CODE).forEach((segment, index) => {
    if (index % 2 === 1) return;
    for (const match of segment.matchAll(WIKI_LINK)) titles.add(match[1].replace(/\s+/g, " ").trim());
  });
  return [...titles];
}
