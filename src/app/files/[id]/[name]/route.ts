import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getUpload, isInlineType, readUploadFile } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  if (!getSettings().publicRead && !(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const upload = /^\d+$/.test(id) ? getUpload(Number(id)) : undefined;
  if (!upload) return new Response("Not Found", { status: 404 });

  let data: Buffer;
  try {
    data = readUploadFile(upload);
  } catch {
    return new Response("Not Found", { status: 404 });
  }
  const inline = isInlineType(upload.contentType);
  const filename = encodeURIComponent(upload.filename);
  return new Response(new Uint8Array(data), {
    headers: {
      // SVG・HTML など、開くとスクリプトが動く可能性がある種類は表示せずダウンロードさせる
      "Content-Type": inline ? upload.contentType : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${filename}`,
      "Content-Length": String(data.length),
      "X-Content-Type-Options": "nosniff",
      // PDF はブラウザ内蔵ビューア（それ自体がサンドボックス化されている）で開けるよう、sandbox を付けない
      ...(upload.contentType === "application/pdf"
        ? {}
        : { "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'" }),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
