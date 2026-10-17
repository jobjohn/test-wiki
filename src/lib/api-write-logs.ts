import { all, run } from "./db";
import { now } from "./text";

export interface WriteLogInput {
  tokenId: number;
  tokenName: string;
  userId: number;
  tool: string;
  targetKind: "page" | "bookmark";
  targetId: number | null;
}

/** 記録の保持期間（1 年） */
export const WRITE_LOG_RETENTION_DAYS = 365;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let lastPurgeAt = 0;

/**
 * 保持期間を過ぎた記録を削除し、消した件数を返す。
 * at を省いた（実運用の）呼び出しは、プロセス内で 1 時間に 1 回までに抑える。
 */
export function purgeExpiredWriteLogs(at?: Date): number {
  if (!at) {
    const current = Date.now();
    if (current - lastPurgeAt < PURGE_INTERVAL_MS) return 0;
  }
  const cutoff = new Date((at ?? new Date()).getTime() - WRITE_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const changes = run("DELETE FROM api_write_logs WHERE created_at < ?", cutoff).changes;
  // 失敗したら次の呼び出しで再試行できるよう、成功してから記録する
  if (!at) lastPurgeAt = Date.now();
  return changes;
}

/** 期限切れの掃除。失敗しても呼び出し元の操作（書き込み・画面表示）は止めず、ログだけ残す */
export function safePurgeWriteLogs() {
  try {
    purgeExpiredWriteLogs();
  } catch (error) {
    console.error("監査ログ: 期限切れの記録を削除できませんでした", error);
  }
}

/** MCP からの書き込み成功を記録する（誰のどのトークンが、何を書き換えたか） */
export function recordWriteLog(entry: WriteLogInput) {
  run(
    "INSERT INTO api_write_logs (api_token_id, token_name, user_id, tool, target_kind, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    entry.tokenId,
    entry.tokenName,
    entry.userId,
    entry.tool,
    entry.targetKind,
    entry.targetId,
    now(),
  );
  safePurgeWriteLogs();
}

export interface WriteLog {
  id: number;
  tokenId: number | null;
  tokenName: string;
  userId: number | null;
  /** ユーザーが削除済みなら null */
  userName: string | null;
  /** 対象の今のタイトル。削除済み・対象なしなら null */
  targetTitle: string | null;
  tool: string;
  targetKind: string;
  targetId: number | null;
  createdAt: string;
}

export function listWriteLogs(limit = 100, offset = 0): WriteLog[] {
  const rows = all<{ id: number; api_token_id: number | null; token_name: string; user_id: number | null; user_name: string | null; tool: string; target_kind: string; target_id: number | null; created_at: string }>(
    `SELECT l.*, COALESCE(u.display_name, u.email) AS user_name FROM api_write_logs l LEFT JOIN users u ON u.id = l.user_id
     ORDER BY l.id DESC LIMIT ? OFFSET ?`,
    limit,
    offset,
  );
  // 対象のタイトルは種類ごとにまとめて引く（1 件ずつ引かない）
  const titles = (table: "pages" | "bookmarks", kind: string): Map<number, string> => {
    const ids = [...new Set(rows.filter((r) => r.target_kind === kind && r.target_id !== null).map((r) => r.target_id!))];
    if (!ids.length) return new Map();
    return new Map(all<{ id: number; title: string }>(`SELECT id, title FROM ${table} WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids).map((r) => [r.id, r.title]));
  };
  const pageTitles = titles("pages", "page");
  const bookmarkTitles = titles("bookmarks", "bookmark");
  return rows.map((r) => ({
    id: r.id,
    tokenId: r.api_token_id,
    tokenName: r.token_name,
    userId: r.user_id,
    userName: r.user_name,
    targetTitle: r.target_id === null ? null : ((r.target_kind === "page" ? pageTitles : bookmarkTitles).get(r.target_id) ?? null),
    tool: r.tool,
    targetKind: r.target_kind,
    targetId: r.target_id,
    createdAt: r.created_at,
  }));
}

/** ツール名の日本語ラベル（画面用）。未知のツールは名前をそのまま出す */
const TOOL_LABELS: Record<string, string> = {
  create_page: "ページを作成",
  update_page: "ページを更新",
  add_bookmark: "リンクを追加",
  update_bookmark: "リンクを更新",
};
export const writeToolLabel = (tool: string): string => TOOL_LABELS[tool] ?? tool;
