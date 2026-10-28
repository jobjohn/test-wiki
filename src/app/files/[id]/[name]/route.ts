import { uploadResponse } from "@/lib/file-response";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * 以前の番号の URL（/files/<id>/<名前>）。既にページへ貼られたリンクを壊さないために残している。
 * 番号は連番なので、閲覧できる人なら番号をたどって他のファイルも開ける（新しいリンクは /files/k/<鍵>/ を使う）。
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  if (!getSettings().publicRead && !(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const upload = /^\d+$/.test(id) ? getUpload(Number(id)) : undefined;
  if (!upload) return new Response("Not Found", { status: 404 });

  return uploadResponse(upload, request.headers.get("range"));
}
