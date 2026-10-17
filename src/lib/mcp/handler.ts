import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { bearerToken, verifyApiToken } from "../api-tokens";
import { isOwnOriginIfPresent, requestOrigin } from "../origin";
import { allowAttempt } from "../rate-limit";
import { createMcpServer } from "./tools";

export const MAX_BODY_BYTES = 1024 * 1024;
export const RATE_LIMIT = 120;
export const RATE_WINDOW_MS = 60_000;

/** JSON-RPC 形式のエラー応答（MCP クライアントがそのまま解釈できる） */
function rpcError(status: number, code: number, message: string, headers: Record<string, string> = {}): Response {
  return Response.json({ jsonrpc: "2.0", error: { code, message }, id: null }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** 上限を超えたら null を返しながら、本文を読む（巨大な本文をメモリに溜めない） */
async function readLimited(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * MCP（Streamable HTTP・ステートレス）の入口。Bearer トークンで認証し、ツールは読み取りだけ。
 * 「ログインなしで閲覧を許可」の設定には関係なく、トークンが必須。
 */
export async function handleMcpRequest(request: Request): Promise<Response> {
  // ブラウザからの別サイトのリクエスト（DNS リバインディング等）を拒否。Origin のない CLI などは通す
  if (!isOwnOriginIfPresent(request)) return rpcError(403, -32000, "Forbidden: 許可されていない Origin です。");

  // ステートレスなので、サーバーからの通知用ストリーム（GET）やセッション終了（DELETE）は使わない
  if (request.method !== "POST") return rpcError(405, -32000, "Method not allowed.", { Allow: "POST" });

  const token = bearerToken(request.headers.get("authorization"));
  const verified = token ? verifyApiToken(token) : null;
  if (!verified) {
    return rpcError(401, -32001, "Unauthorized: 有効なアクセストークンが必要です。", { "WWW-Authenticate": "Bearer" });
  }

  if (!allowAttempt(`mcp:${verified.tokenId}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return rpcError(429, -32000, "リクエストが多すぎます。しばらく待ってから再度お試しください。", { "Retry-After": "60" });
  }

  const text = await readLimited(request, MAX_BODY_BYTES);
  if (text === null) return rpcError(413, -32000, "リクエストが大きすぎます（上限 1MB）。");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return rpcError(400, -32700, "Parse error: JSON として読み取れません。");
  }

  // リクエストごとにサーバーとトランスポートを作る（セッションを持たない）。JSON で直接応答する
  const server = createMcpServer(requestOrigin(request.headers, request.url));
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    const response = await transport.handleRequest(request, { parsedBody: body });
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    // 本文は enableJsonResponse により完結しているので、読み切ってから後始末する
    const payload = await response.arrayBuffer();
    return new Response(payload.byteLength ? payload : null, { status: response.status, headers });
  } finally {
    await transport.close();
    await server.close();
  }
}
