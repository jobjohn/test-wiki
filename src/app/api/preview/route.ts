import { isSameOrigin } from "@/lib/origin";
import { renderMarkdown } from "@/lib/markdown";
import { getCurrentUser } from "@/lib/session";
import { canEdit } from "@/lib/users";

export const dynamic = "force-dynamic";
const MAX_BODY = 2 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "不正なリクエストです。" }, { status: 403 });
  if (!canEdit(await getCurrentUser())) return Response.json({ error: "ログインが必要です。" }, { status: 401 });

  const text = await request.text();
  if (text.length > MAX_BODY) return Response.json({ error: "本文が大きすぎます。" }, { status: 413 });
  let body = "";
  try {
    body = String((JSON.parse(text) as { body?: unknown }).body ?? "");
  } catch {
    return Response.json({ error: "不正なリクエストです。" }, { status: 400 });
  }
  return Response.json({ html: renderMarkdown(body) }, { headers: { "Cache-Control": "no-store" } });
}
