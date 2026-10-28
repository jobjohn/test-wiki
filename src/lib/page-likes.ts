import { get, run, transaction } from "./db";
import { NotFoundError } from "./errors";
import { now } from "./text";

/** ページの「いいね!」の数と、見ている人が押しているか */
export interface PageLikes {
  count: number;
  liked: boolean;
}

export function likeCount(pageId: number): number {
  return get<{ n: number }>("SELECT COUNT(*) AS n FROM page_likes WHERE page_id = ?", pageId)?.n ?? 0;
}

/** userId が null（未ログインの閲覧）なら、押していない扱い */
export function pageLikes(pageId: number, userId: number | null): PageLikes {
  const liked = userId !== null && !!get("SELECT 1 FROM page_likes WHERE page_id = ? AND user_id = ?", pageId, userId);
  return { count: likeCount(pageId), liked };
}

/**
 * いいね!を付ける・外す。「切り替え」ではなく目標の状態を受け取るので、
 * 二重送信や画面の表示が古くても、何度実行しても同じ結果になる
 */
export function setPageLike(pageId: number, userId: number, liked: boolean): PageLikes {
  return transaction(() => {
    if (!get("SELECT 1 FROM pages WHERE id = ?", pageId)) throw new NotFoundError("page not found");
    if (liked) run("INSERT OR IGNORE INTO page_likes (page_id, user_id, created_at) VALUES (?, ?, ?)", pageId, userId, now());
    else run("DELETE FROM page_likes WHERE page_id = ? AND user_id = ?", pageId, userId);
    return pageLikes(pageId, userId);
  });
}
