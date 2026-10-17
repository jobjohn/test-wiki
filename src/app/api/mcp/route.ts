import { handleMcpRequest } from "@/lib/mcp/handler";

// トークンごとの応答で、キャッシュさせない。node:sqlite を使うので Node.js ランタイム
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = handleMcpRequest;
export const GET = handleMcpRequest;
export const DELETE = handleMcpRequest;
export const PUT = handleMcpRequest;
export const PATCH = handleMcpRequest;
