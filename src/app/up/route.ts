import { get } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 死活監視用（データベースに接続できれば 200） */
export function GET() {
  try {
    get("SELECT 1");
    return new Response("ok", { headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response("database unavailable", { status: 503 });
  }
}
