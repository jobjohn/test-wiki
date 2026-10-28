import { uploadResponse } from "@/lib/file-response";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getUploadByAccessKey } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** 推測できない鍵の URL（/files/k/<鍵>/<名前>）。新しく貼るリンクはこちらを使う */
export async function GET(request: Request, { params }: { params: Promise<{ key: string; name: string }> }) {
  if (!getSettings().publicRead && !(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const { key } = await params;
  const upload = getUploadByAccessKey(key);
  if (!upload) return new Response("Not Found", { status: 404 });

  return uploadResponse(upload, request.headers.get("range"));
}
