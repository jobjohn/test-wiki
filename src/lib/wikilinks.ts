import { keyOf } from "./text";

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

/** Wiki リンクのページ名に使えない文字（[ ] | 改行） */
export const canBeWikiLinkTitle = (title: string): boolean => !/[[\]|\n]/.test(title);

/**
 * 本文中の旧ページ名への Wiki リンクを新しいページ名に書き換える（コード内は対象外）。
 * 旧ページ名は keyOf と同じ規則（空白・全角半角・大文字小文字）で照合し、[[旧|表示名]] の表示名は残す。
 * 新しいページ名が Wiki リンクで書けない文字を含むときは何も変えない。
 */
export function renameWikiLinks(text: string, oldTitle: string, newTitle: string): string {
  if (!canBeWikiLinkTitle(newTitle)) return text;
  const oldKey = keyOf(oldTitle);
  return text
    .split(CODE)
    .map((segment, index) =>
      index % 2 === 1
        ? segment
        : segment.replace(WIKI_LINK, (link, title: string, label: string | undefined) =>
            keyOf(title) === oldKey ? `[[${newTitle}${label === undefined ? "" : `|${label}`}]]` : link,
          ),
    )
    .join("");
}
