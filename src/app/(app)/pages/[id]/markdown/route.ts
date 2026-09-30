import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getPage } from "@/lib/pages";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!getSettings().publicRead && !(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const page = /^\d+$/.test(id) ? getPage(Number(id)) : undefined;
  if (!page) return new Response("Not Found", { status: 404 });

  const disposition = new URL(request.url).searchParams.has("download") ? "attachment" : "inline";
  return new Response(page.body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(`${page.title}.md`)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
