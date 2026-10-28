import { ValidationError } from "@/lib/errors";
import { isSameOrigin } from "@/lib/origin";
import { getCurrentUser } from "@/lib/session";
import { MAX_UPLOAD_SIZE, storeUpload, storeUploadStream, uploadMarkdown, uploadPath, type Upload } from "@/lib/uploads";
import { canEdit } from "@/lib/users";

export const dynamic = "force-dynamic";

/** 本体をそのまま送る形式で、ファイル名を入れるヘッダー（encodeURIComponent した値） */
const FILENAME_HEADER = "x-file-name";

const decodeFilename = (value: string | null) => {
  try {
    return value ? decodeURIComponent(value) : "";
  } catch {
    return "";
  }
};

/**
 * ファイルを受け取って保存する。
 * - 画面からは、ファイルの中身をそのまま本文として送る（ファイル名は X-File-Name ヘッダー）。少しずつディスクへ書くので、全体をメモリに載せない
 * - 以前からの multipart/form-data（file フィールド）も受け付ける（こちらは一度メモリに読み込む）
 * このパスは proxy の対象外にしてある（proxy を通すと本文が 10MB で切り詰められるため。next.config / src/proxy.ts 参照）
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "不正なリクエストです。" }, { status: 403 });
  const user = await getCurrentUser();
  if (!canEdit(user)) return Response.json({ error: "ログインが必要です。" }, { status: 401 });

  const lengthHeader = request.headers.get("content-length");
  const declared = lengthHeader === null ? undefined : Number(lengthHeader);
  const contentType = request.headers.get("content-type") ?? "";
  const multipart = /^multipart\/form-data/i.test(contentType);
  if ((declared ?? 0) > MAX_UPLOAD_SIZE + (multipart ? 1024 * 1024 : 0)) {
    return Response.json({ error: `ファイルは ${MAX_UPLOAD_SIZE / 1024 / 1024}MB 以下にしてください。` }, { status: 413 });
  }
  try {
    let upload: Upload;
    if (multipart) {
      const file = (await request.formData()).get("file");
      if (!(file instanceof File)) throw new ValidationError("ファイルを選択してください");
      upload = await storeUpload(file, user!.id);
    } else {
      if (!request.body) throw new ValidationError("ファイルを選択してください");
      upload = await storeUploadStream(
        {
          stream: request.body,
          filename: decodeFilename(request.headers.get(FILENAME_HEADER)),
          contentType: contentType.split(";")[0].trim(),
          expectedSize: declared !== undefined && Number.isFinite(declared) ? declared : undefined,
        },
        user!.id,
      );
    }
    return Response.json(
      { id: upload.id, name: upload.filename, url: uploadPath(upload), markdown: uploadMarkdown(upload) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      const tooLarge = error.messages.some((m) => m.includes("MB 以下"));
      return Response.json({ error: error.messages.join("、") }, { status: tooLarge ? 413 : 422 });
    }
    throw error;
  }
}
