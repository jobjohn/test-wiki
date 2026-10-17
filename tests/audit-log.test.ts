import { describe, expect, it } from "vitest";
import { listWriteLogs, purgeExpiredWriteLogs, recordWriteLog, WRITE_LOG_RETENTION_DAYS, writeToolLabel } from "@/lib/api-write-logs";
import { createBookmark } from "@/lib/bookmarks";
import { get, run } from "@/lib/db";
import { createUser, deleteUser } from "@/lib/users";

const DAY = 24 * 60 * 60 * 1000;
const insertAt = (createdAt: string, userId: number | null = null) =>
  run(
    "INSERT INTO api_write_logs (api_token_id, token_name, user_id, tool, target_kind, target_id, created_at) VALUES (1, 'T', ?, 'create_page', 'page', 1, ?)",
    userId,
    createdAt,
  );
const count = () => get<{ n: number }>("SELECT COUNT(*) AS n FROM api_write_logs")!.n;

describe("MCP の監査ログ", () => {
  it("1 年より古い記録だけを削除する（時刻を引数で渡せる）", () => {
    const base = new Date("2030-01-01T00:00:00Z");
    insertAt(new Date(base.getTime() - (WRITE_LOG_RETENTION_DAYS + 1) * DAY).toISOString());
    insertAt(new Date(base.getTime() - (WRITE_LOG_RETENTION_DAYS - 1) * DAY).toISOString());
    const before = count();
    expect(purgeExpiredWriteLogs(base)).toBe(1);
    expect(count()).toBe(before - 1);
    expect(purgeExpiredWriteLogs(base)).toBe(0);
  });

  it("一覧は新しい順で、ユーザー名・削除済みユーザー・ページ送りに対応する", () => {
    const user = createUser({ email: "audit-user@example.com", displayName: "監査の人", role: "admin", password: "password123" });
    recordWriteLog({ tokenId: 5, tokenName: "tok", userId: user, tool: "update_bookmark", targetKind: "bookmark", targetId: 3 });
    recordWriteLog({ tokenId: 5, tokenName: "tok", userId: user, tool: "create_page", targetKind: "page", targetId: 4 });
    const [first, second] = listWriteLogs(2, 0);
    expect([first.tool, first.userName, first.tokenName]).toEqual(["create_page", "監査の人", "tok"]);
    expect(second.tool).toBe("update_bookmark");
    expect(listWriteLogs(1, 1)[0].tool).toBe("update_bookmark");
    deleteUser(user);
    expect(listWriteLogs(1, 0)[0]).toMatchObject({ userId: null, userName: null });
  });

  it("対象のタイトルをまとめて引き、存在しなければ null にする", () => {
    const id = createBookmark({ url: "https://audit.example.com/", title: "監査対象", descriptionMd: "", tags: "", faviconUrl: "", userId: null });
    recordWriteLog({ tokenId: 5, tokenName: "tok", userId: 1, tool: "update_bookmark", targetKind: "bookmark", targetId: id });
    recordWriteLog({ tokenId: 5, tokenName: "tok", userId: 1, tool: "update_page", targetKind: "page", targetId: 999999 });
    const [gone, found] = listWriteLogs(2, 0);
    expect(gone.targetTitle).toBeNull();
    expect(found).toMatchObject({ targetTitle: "監査対象", id: expect.any(Number) });
  });

  it("ツール名を日本語のラベルにする", () => {
    expect(writeToolLabel("create_page")).toBe("ページを作成");
    expect(writeToolLabel("unknown_tool")).toBe("unknown_tool");
  });
});
