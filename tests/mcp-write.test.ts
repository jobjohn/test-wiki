import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiToken } from "@/lib/api-tokens";
import { listWriteLogs } from "@/lib/api-write-logs";
import { createBookmark, getBookmark } from "@/lib/bookmarks";
import { all, get, getDb } from "@/lib/db";
import { handleMcpRequest } from "@/lib/mcp/handler";
import { resetAttempts } from "@/lib/rate-limit";
import { createPage, getPage, latestRevision, listRevisions, tagList } from "@/lib/pages";
import { updateSettings } from "@/lib/settings";
import { fetchUrlMetadata } from "@/lib/url-metadata";
import { createUser, updateUser } from "@/lib/users";

// 外部サイトへは接続しない
vi.mock("@/lib/url-metadata", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/url-metadata")>()),
  fetchUrlMetadata: vi.fn(),
}));
const fetchMetadata = vi.mocked(fetchUrlMetadata);

const URL_BASE = "http://wiki.test/api/mcp";
const HOST = "wiki.test";
const WRITE_TOOLS = ["create_page", "update_page", "add_bookmark", "update_bookmark"];

let userId: number;
let readToken: string;
let writeToken: string;
let writeTokenId: number;
let seq = 0;

const setWrite = (enabled: boolean) => updateSettings({ wikiName: "Wiki", description: "", mcpWriteEnabled: enabled });
const newWriteToken = (uid = userId) => {
  setWrite(true);
  return createApiToken(uid, { name: `write-${++seq}`, scope: "write" }).token;
};

beforeAll(() => {
  getDb();
  updateSettings({ wikiName: "Wiki", description: "" }, { completeSetup: true });
  userId = createUser({ email: "mcp-writer@example.com", displayName: "書き手", role: "general", password: "password123" });
  readToken = createApiToken(userId, { name: "read" }).token;
  writeToken = newWriteToken();
  writeTokenId = get<{ id: number }>("SELECT id FROM api_tokens ORDER BY id DESC LIMIT 1")!.id;
});

beforeEach(() => {
  setWrite(true);
  // 共有の write トークンが他のテストの回数で制限されないようにする
  resetAttempts(`mcp-write:${writeTokenId}`);
  fetchMetadata.mockReset();
});

async function connect(bearer: string) {
  const client = new Client({ name: "test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(URL_BASE), {
    requestInit: { headers: { authorization: `Bearer ${bearer}`, host: HOST } },
    fetch: (input, init) => handleMcpRequest(new Request(input, init)),
  });
  await client.connect(transport);
  return client;
}

type ToolResult = { isError?: boolean; content: { text: string }[]; structuredContent?: Record<string, unknown> };

/** ツールを呼ぶ。未登録のツールは、プロトコルのエラーでも isError でも「拒否」として扱う */
async function call(bearer: string, name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const client = await connect(bearer);
  try {
    return (await client.callTool({ name, arguments: args })) as ToolResult;
  } catch (error) {
    return { isError: true, content: [{ text: String(error) }] };
  } finally {
    await client.close();
  }
}
const text = (r: ToolResult) => r.content[0].text;
const toolNames = async (bearer: string) => {
  const client = await connect(bearer);
  try {
    return (await client.listTools()).tools.map((t) => t.name);
  } finally {
    await client.close();
  }
};

describe("書き込みの 3 条件", () => {
  it("read トークンでは書き込みツールが一覧に出ず、呼んでも拒否される", async () => {
    const names = await toolNames(readToken);
    for (const name of WRITE_TOOLS) expect(names).not.toContain(name);
    const result = await call(readToken, "create_page", { title: "読み取りトークン", body: "x" });
    expect(result.isError).toBe(true);
    expect(get("SELECT 1 FROM pages WHERE title = '読み取りトークン'")).toBeUndefined();
  });

  it("設定が無効なら、write トークンでも書き込みツールが出ず、拒否される", async () => {
    setWrite(false);
    for (const name of WRITE_TOOLS) expect(await toolNames(writeToken)).not.toContain(name);
    const result = await call(writeToken, "create_page", { title: "設定無効", body: "x" });
    expect(result.isError).toBe(true);
    expect(get("SELECT 1 FROM pages WHERE title = '設定無効'")).toBeUndefined();
    const client = await connect(writeToken);
    expect(client.getInstructions()).toContain("読み取り専用");
    await client.close();
  });

  it("3 条件がそろうと書き込みツールが出て、注釈と instructions が書き込み用になる", async () => {
    const client = await connect(writeToken);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(expect.arrayContaining(WRITE_TOOLS));
    const byName = Object.fromEntries(tools.map((t) => [t.name, t.annotations]));
    expect(byName.create_page).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: false });
    expect(byName.add_bookmark).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true });
    expect(byName.update_page).toMatchObject({ readOnlyHint: false, destructiveHint: true, idempotentHint: false });
    expect(byName.update_bookmark).toMatchObject({ readOnlyHint: false, destructiveHint: true, idempotentHint: false });
    expect(client.getInstructions()).toContain("はっきり依頼したときだけ");
    expect(tools.find((t) => t.name === "update_page")!.description).toContain("hasMore=false");
    await client.close();
  });

  it("編集できないユーザー（無効化されたユーザー）のトークンは拒否される", async () => {
    const other = createUser({ email: "mcp-disabled@example.com", role: "general", password: "password123" });
    const token = newWriteToken(other);
    expect(await toolNames(token)).toContain("create_page");
    updateUser(other, { email: "mcp-disabled@example.com", role: "general", status: "disabled" });
    const res = await handleMcpRequest(
      new Request(URL_BASE, {
        method: "POST",
        headers: { host: HOST, "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("設定を途中で無効にすると、既存の write トークンの書き込みが拒否される", async () => {
    const before = await call(writeToken, "create_page", { title: "途中無効の前", body: "x" });
    expect(before.isError).toBeFalsy();
    setWrite(false);
    const after = await call(writeToken, "create_page", { title: "途中無効の後", body: "x" });
    expect(after.isError).toBe(true);
    expect(get("SELECT 1 FROM pages WHERE title = '途中無効の後'")).toBeUndefined();
  });
});

describe("create_page / update_page", () => {
  it("作成でき、版の書き込み元が mcp になり、応答に本文が含まれない", async () => {
    const result = await call(writeToken, "create_page", { title: "MCP で作成", body: "秘密っぽい本文", tags: ["AI", "メモ"], summary: "テスト" });
    expect(result.isError).toBeFalsy();
    const { id, revision, lockVersion, url } = result.structuredContent as { id: number; revision: number; lockVersion: number; url: string };
    expect(revision).toBe(1);
    expect(lockVersion).toBe(0);
    expect(url).toBe(`http://wiki.test/pages/${id}`);
    expect(JSON.stringify(result)).not.toContain("秘密っぽい本文");
    expect(listRevisions(id).map((r) => [r.number, r.source, r.userId, r.summary])).toEqual([[1, "mcp", userId, "テスト"]]);
    expect(tagList(id).split(", ").sort()).toEqual(["AI", "メモ"]);
  });

  it("タグはカンマ区切りの文字列でもよい。同じタイトルはエラー", async () => {
    const ok = await call(writeToken, "create_page", { title: "カンマタグ", body: "x", tags: "a, b" });
    expect(ok.isError).toBeFalsy();
    expect(tagList((ok.structuredContent as { id: number }).id).split(", ").sort()).toEqual(["a", "b"]);
    const dup = await call(writeToken, "create_page", { title: "カンマタグ", body: "y" });
    expect(dup.isError).toBe(true);
    expect(text(dup)).toContain("同じタイトル");
  });

  it("update_page: 省略した項目は今の値のまま、版が増え、lockVersion が進む", async () => {
    const id = createPage({ title: "更新対象", body: "元の本文", folderId: null, position: 3, tags: "x, y", userId });
    const result = await call(writeToken, "update_page", { id, lock_version: 0, body: "新しい本文", summary: "AI が更新" });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({ id, revision: 2, lockVersion: 1 });
    const page = getPage(id)!;
    expect(page).toMatchObject({ title: "更新対象", body: "新しい本文", position: 3, lockVersion: 1 });
    expect(tagList(id).split(", ").sort()).toEqual(["x", "y"]);
    expect(latestRevision(id)).toMatchObject({ number: 2, source: "mcp", summary: "AI が更新" });
    // 画面の履歴（初版）は source なしのまま
    expect(listRevisions(id).find((r) => r.number === 1)!.source).toBeNull();

    const titleOnly = await call(writeToken, "update_page", { id, lock_version: 1, title: "更新対象（改）", tags: ["z"] });
    expect(titleOnly.isError).toBeFalsy();
    expect(getPage(id)).toMatchObject({ title: "更新対象（改）", body: "新しい本文" });
    expect(tagList(id)).toBe("z");
  });

  it("lock_version が古いと isError で、最新の lockVersion を返し、更新しない", async () => {
    const id = createPage({ title: "競合", body: "a", folderId: null, position: 0, tags: "", userId });
    await call(writeToken, "update_page", { id, lock_version: 0, body: "b" });
    const stale = await call(writeToken, "update_page", { id, lock_version: 0, body: "c" });
    expect(stale.isError).toBe(true);
    expect(text(stale)).toContain("他の人が先に更新しました。get_page で取得し直してください");
    expect(text(stale)).toContain("最新の lockVersion: 1");
    expect(getPage(id)!.body).toBe("b");
    const missing = await call(writeToken, "update_page", { id: 999999, lock_version: 0, body: "c" });
    expect(missing.isError).toBe(true);
  });

  it("本文が大きく短くなる更新は、confirm_shrink: true がない限り拒否する", async () => {
    const original = "あ".repeat(2000);
    const id = createPage({ title: "縮小", body: original, folderId: null, position: 0, tags: "", userId });
    const refused = await call(writeToken, "update_page", { id, lock_version: 0, body: "短い" });
    expect(refused.isError).toBe(true);
    expect(text(refused)).toContain("本文の後半が失われている恐れ");
    expect(text(refused)).toContain("hasMore=false");
    expect(getPage(id)!.body).toBe(original);
    // 半分以上なら通常どおり更新できる
    const half = await call(writeToken, "update_page", { id, lock_version: 0, body: "い".repeat(1000) });
    expect(half.isError).toBeFalsy();
    // 確認つきなら短くできる
    const confirmed = await call(writeToken, "update_page", { id, lock_version: 1, body: "短い", confirm_shrink: true });
    expect(confirmed.isError).toBeFalsy();
    expect(getPage(id)!.body).toBe("短い");
  });

  it("元の本文が 2000 文字未満なら、短くしても拒否しない。body を送らない更新も拒否しない", async () => {
    const id = createPage({ title: "小さい本文", body: "あ".repeat(1999), folderId: null, position: 0, tags: "", userId });
    expect((await call(writeToken, "update_page", { id, lock_version: 0, body: "短い" })).isError).toBeFalsy();
    const big = createPage({ title: "大きい本文", body: "あ".repeat(5000), folderId: null, position: 0, tags: "", userId });
    expect((await call(writeToken, "update_page", { id: big, lock_version: 0, title: "大きい本文（改）" })).isError).toBeFalsy();
    expect(getPage(big)!.body).toHaveLength(5000);
  });

  it("get_page が lockVersion を返し、そのまま update_page に使える", async () => {
    const id = createPage({ title: "取得して更新", body: "本文", folderId: null, position: 0, tags: "", userId });
    const client = await connect(readToken);
    const got = await client.callTool({ name: "get_page", arguments: { id } });
    await client.close();
    expect((got.structuredContent as { lockVersion: number }).lockVersion).toBe(0);
    expect(text(got as ToolResult)).toContain("lockVersion: 0");
    const updated = await call(writeToken, "update_page", { id, lock_version: 0, body: "本文（更新）" });
    expect(updated.isError).toBeFalsy();
  });
});

describe("add_bookmark / update_bookmark", () => {
  it("title を省略すると取得したタイトルとファビコンで登録する", async () => {
    fetchMetadata.mockResolvedValue({ title: "取得したタイトル", favicon: "data:image/png;base64,iVBORw0KGgo=" });
    const result = await call(writeToken, "add_bookmark", { url: "https://example.com/auto", tags: "資料" });
    expect(result.isError).toBeFalsy();
    const { id, url } = result.structuredContent as { id: number; url: string };
    expect(url).toBe("https://example.com/auto");
    expect(getBookmark(id)).toMatchObject({ title: "取得したタイトル", createdBy: userId, faviconUrl: "data:image/png;base64,iVBORw0KGgo=" });
  });

  it("取得できず title もないとエラー。title があれば取得に失敗しても登録できる", async () => {
    fetchMetadata.mockRejectedValue(new Error("timeout"));
    const failed = await call(writeToken, "add_bookmark", { url: "https://example.com/fail" });
    expect(failed.isError).toBe(true);
    expect(text(failed)).toContain("title を指定");
    expect(get("SELECT 1 FROM bookmarks WHERE url = 'https://example.com/fail'")).toBeUndefined();
    const manual = await call(writeToken, "add_bookmark", { url: "https://example.com/fail", title: "手入力" });
    expect(manual.isError).toBeFalsy();
  });

  it("title を指定すれば、その title を使う", async () => {
    fetchMetadata.mockResolvedValue({ title: "サイト側のタイトル", favicon: null });
    const result = await call(writeToken, "add_bookmark", { url: "https://example.com/given", title: "指定したタイトル", description: "説明" });
    expect(getBookmark((result.structuredContent as { id: number }).id)).toMatchObject({ title: "指定したタイトル", descriptionMd: "説明" });
  });

  it("同じ URL は、既存の id（タイトルは返さない）を返して拒否する（外部取得もしない）", async () => {
    const existing = createBookmark({ url: "https://example.com/dup", title: "既存のリンク", descriptionMd: "", tags: "", faviconUrl: "", userId });
    const result = await call(writeToken, "add_bookmark", { url: "https://example.com/dup/", title: "別名" });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain(`id: ${existing}`);
    expect(text(result)).toContain("get_bookmark");
    // 利用者が書いたタイトルは返さない
    expect(text(result)).not.toContain("既存のリンク");
    expect(fetchMetadata).not.toHaveBeenCalled();
  });

  it("不正な URL は拒否する", async () => {
    const result = await call(writeToken, "add_bookmark", { url: "ftp://example.com/x", title: "x" });
    expect(result.isError).toBe(true);
    expect(fetchMetadata).not.toHaveBeenCalled();
  });

  it("update_bookmark: 省略した項目は今の値のまま。URL の重複は拒否する", async () => {
    const id = createBookmark({ url: "https://example.com/u1", title: "元のタイトル", descriptionMd: "元の説明", tags: "a, b", faviconUrl: "data:image/png;base64,iVBORw0KGgo=", userId });
    const other = createBookmark({ url: "https://example.com/u2", title: "別のリンク", descriptionMd: "", tags: "", faviconUrl: "", userId });
    const result = await call(writeToken, "update_bookmark", { id, title: "新しいタイトル" });
    expect(result.isError).toBeFalsy();
    expect(getBookmark(id)).toMatchObject({ title: "新しいタイトル", url: "https://example.com/u1", descriptionMd: "元の説明", faviconUrl: "data:image/png;base64,iVBORw0KGgo=" });
    expect(getBookmark(id)!.tags.map((t) => t.name).sort()).toEqual(["a", "b"]);

    const clash = await call(writeToken, "update_bookmark", { id, url: "https://example.com/u2" });
    expect(clash.isError).toBe(true);
    expect(text(clash)).toContain(`id: ${other}`);
    const moved = await call(writeToken, "update_bookmark", { id, url: "https://example.com/u3" });
    expect(moved.isError).toBeFalsy();
    expect(getBookmark(id)).toMatchObject({ url: "https://example.com/u3", faviconUrl: null });
    expect((await call(writeToken, "update_bookmark", { id: 999999, title: "x" })).isError).toBe(true);
  });
});

describe("監査ログと回数制限", () => {
  it("成功した書き込みだけが api_write_logs に記録される", async () => {
    const token = newWriteToken();
    const tokenId = get<{ id: number }>("SELECT id FROM api_tokens ORDER BY id DESC LIMIT 1")!.id;
    const created = await call(token, "create_page", { title: "監査ログ", body: "x" });
    const id = (created.structuredContent as { id: number }).id;
    await call(token, "create_page", { title: "監査ログ", body: "重複で失敗" });
    await call(token, "update_page", { id, lock_version: 0, body: "y" });
    const logs = listWriteLogs().filter((l) => l.tokenId === tokenId);
    expect(logs.map((l) => [l.tool, l.targetKind, l.targetId, l.userId])).toEqual([
      ["update_page", "page", id, userId],
      ["create_page", "page", id, userId],
    ]);
    expect(logs[0].tokenName).toMatch(/^write-/);
    expect(all("SELECT 1 FROM api_write_logs WHERE api_token_id = ?", tokenId)).toHaveLength(2);
  });

  it("書き込みは 1 分に 20 回まで。21 回目は isError", async () => {
    const token = newWriteToken();
    const client = await connect(token);
    for (let i = 0; i < 20; i++) {
      const r = (await client.callTool({ name: "create_page", arguments: { title: `連続 ${i}`, body: "x" } })) as ToolResult;
      expect(r.isError).toBeFalsy();
    }
    const limited = (await client.callTool({ name: "create_page", arguments: { title: "連続 20", body: "x" } })) as ToolResult;
    expect(limited.isError).toBe(true);
    expect(text(limited)).toContain("上限");
    expect(get("SELECT 1 FROM pages WHERE title = '連続 20'")).toBeUndefined();
    // 読み取りは制限されない
    expect(((await client.callTool({ name: "list_tags", arguments: {} })) as ToolResult).isError).toBeFalsy();
    await client.close();
    // 別のトークンは影響を受けない
    expect((await call(writeToken, "create_page", { title: "別トークン", body: "x" })).isError).toBeFalsy();
  });
});
