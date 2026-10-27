import type { DatabaseSync } from "node:sqlite";
import { keyOf } from "./text";
import { extractWikiLinkTitles } from "./wikilinks";

/** 本文中の [[リンク]] 先を、タイトルの比較用キー（重複なし）で返す */
export const linkTargetKeys = (body: string): string[] => [...new Set(extractWikiLinkTitles(body).map(keyOf))];

/**
 * ページのリンク先を page_links に書き直す。
 * リンク先はページ ID ではなくタイトルのキーで持つため、リンク先のページの作成・改名・削除では書き換え不要。
 */
export function writePageLinks(db: DatabaseSync, pageId: number, body: string) {
  db.prepare("DELETE FROM page_links WHERE source_id = ?").run(pageId);
  const insert = db.prepare("INSERT INTO page_links (source_id, target_key) VALUES (?, ?)");
  for (const key of linkTargetKeys(body)) insert.run(pageId, key);
}

/** すべてのページのリンクを作り直す（マイグレーション・初期データの投入時） */
export function rebuildPageLinks(db: DatabaseSync) {
  db.exec("DELETE FROM page_links");
  for (const page of db.prepare("SELECT id, body FROM pages").all() as { id: number; body: string }[]) {
    writePageLinks(db, page.id, page.body);
  }
}
