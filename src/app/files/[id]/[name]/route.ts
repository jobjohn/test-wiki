import { uploadResponse } from "@/lib/file-response";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  if (!getSettings().publicRead && !(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const upload = /^\d+$/.test(id) ? getUpload(Number(id)) : undefined;
  if (!upload) return new Response("Not Found", { status: 404 });

  return uploadResponse(upload, request.headers.get("range"));
}
