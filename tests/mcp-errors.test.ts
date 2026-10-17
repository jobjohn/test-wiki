import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { beforeAll, expect, it, vi } from "vitest";
import { createApiToken } from "@/lib/api-tokens";
import { getDb } from "@/lib/db";
import { handleMcpRequest } from "@/lib/mcp/handler";
import { updateSettings } from "@/lib/settings";
import { createUser } from "@/lib/users";

// 検索で内部の例外が起きた状況を作る
vi.mock("@/lib/pages", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/pages")>()),
  searchPages: () => {
    throw new Error("SQLITE_ERROR: secret internal detail /data/wiki.sqlite3");
  },
}));

let token: string;
beforeAll(() => {
  getDb();
  updateSettings({ wikiName: "Wiki", description: "" }, { completeSetup: true });
  token = createApiToken(createUser({ email: "err@example.com", role: "general", password: "password123" }), { name: "t" }).token;
});

it("ツール内の予期しない例外は、内部メッセージを返さず固定文言の isError にする（サーバー側には記録）", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://wiki.test/api/mcp"), {
      requestInit: { headers: { authorization: `Bearer ${token}`, host: "wiki.test" } },
      fetch: (input, init) => handleMcpRequest(new Request(input, init)),
    }),
  );
  const result = await client.callTool({ name: "search_pages", arguments: { query: "x" } });
  expect(result.isError).toBe(true);
  const text = (result.content as { text: string }[])[0].text;
  expect(text).toBe("処理中にエラーが発生しました。時間をおいて再度お試しください。");
  expect(text).not.toContain("secret");
  expect(log).toHaveBeenCalled();
  await client.close();
  log.mockRestore();
});
