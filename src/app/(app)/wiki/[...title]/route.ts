import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { findPageByTitle } from "@/lib/pages";

export const dynamic = "force-dynamic";

const redirectTo = (location: string) => new Response(null, { status: 307, headers: { Location: location } });

/** /wiki/ページ名 でタイトルからページを開く。存在しなければ作成画面へ */
export async function GET(_request: Request, { params }: { params: Promise<{ title: string[] }> }) {
  if (!getSettings().publicRead && !(await getCurrentUser())) return redirectTo("/login");

  const title = (await params).title.map(decodeURIComponent).join("/");
  const page = findPageByTitle(title);
  return redirectTo(page ? `/pages/${page.id}` : `/pages/new?title=${encodeURIComponent(title)}`);
}
