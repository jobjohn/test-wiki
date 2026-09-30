import { ValidationError } from "@/lib/errors";
import { isSameOrigin } from "@/lib/origin";
import { getCurrentUser } from "@/lib/session";
import { MAX_UPLOAD_SIZE, storeUpload, uploadMarkdown, uploadPath } from "@/lib/uploads";
import { canEdit } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "不正なリクエストです。" }, { status: 403 });
  const user = await getCurrentUser();
  if (!canEdit(user)) return Response.json({ error: "ログインが必要です。" }, { status: 401 });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_SIZE + 1024 * 1024) {
    return Response.json({ error: `ファイルは ${MAX_UPLOAD_SIZE / 1024 / 1024}MB 以下にしてください。` }, { status: 413 });
  }
  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) throw new ValidationError("ファイルを選択してください");
    const upload = await storeUpload(file, user!.id);
    return Response.json(
      { id: upload.id, name: upload.filename, url: uploadPath(upload), markdown: uploadMarkdown(upload) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ValidationError) return Response.json({ error: error.messages.join("、") }, { status: 422 });
    throw error;
  }
}
