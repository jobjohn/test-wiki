// Storybook 用: src/lib/pages.ts の代わり。データベースを読む関数だけを、固定のサンプルデータで置き換える。
export type { Page, Tag } from "../../src/lib/pages";

const SAMPLE_TAGS = [
  { id: 1, name: "API" },
  { id: 2, name: "認証" },
];

/** 本文の [[Wiki リンク]] を解決する。「Markdown の書き方」だけが存在するページ（ID 1）として扱う */
export function pageIdsByTitle(titles: string[]): Map<string, number> {
  const known = new Map([["markdown の書き方", 1]]);
  return new Map(titles.map((t) => t.toLowerCase()).flatMap((key) => (known.has(key) ? [[key, known.get(key)!] as [string, number]] : [])));
}

/** 一覧に出すタグ。先頭のページには 2 つ、2 番目には 1 つ、それ以降はなし */
export function tagsForPages(pageIds: number[]) {
  return new Map(pageIds.map((id, i) => [id, SAMPLE_TAGS.slice(0, Math.max(0, 2 - i))]));
}
