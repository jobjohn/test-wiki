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
}

export interface WriteLog {
  tokenId: number | null;
  tokenName: string;
  userId: number | null;
  tool: string;
  targetKind: string;
  targetId: number | null;
  createdAt: string;
}

export const listWriteLogs = (limit = 100): WriteLog[] =>
  all<{ api_token_id: number | null; token_name: string; user_id: number | null; tool: string; target_kind: string; target_id: number | null; created_at: string }>(
    "SELECT * FROM api_write_logs ORDER BY id DESC LIMIT ?",
    limit,
  ).map((r) => ({
    tokenId: r.api_token_id,
    tokenName: r.token_name,
    userId: r.user_id,
    tool: r.tool,
    targetKind: r.target_kind,
    targetId: r.target_id,
    createdAt: r.created_at,
  }));
