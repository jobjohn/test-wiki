import fs from "node:fs";
import { Readable } from "node:stream";
import { isInlineType, type Upload, uploadFilePath } from "./uploads";

export type ByteRange = { start: number; end: number };

/**
 * Range ヘッダー（bytes=単一範囲のみ）を解釈する。
 * 解釈できない・複数範囲のときは null（全体を返す）、範囲がファイルの外なら "unsatisfiable"。
 */
export function parseRange(header: string | null, size: number): ByteRange | "unsatisfiable" | null {
  const match = header?.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2]) || size === 0) return null;
  if (!match[1]) {
    // bytes=-N（末尾 N バイト）
    const length = Number(match[2]);
    if (length === 0) return "unsatisfiable";
    return { start: Math.max(0, size - length), end: size - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (match[2] && Number(match[2]) < start) return null;
  if (start >= size) return "unsatisfiable";
  return { start, end };
}

/** アップロードファイルを返すレスポンス。全体を読み込まずストリームで返し、Range（動画・音声のシーク）に対応する */
export function uploadResponse(upload: Upload, rangeHeader: string | null = null): Response {
  const file = uploadFilePath(upload);
  let size: number;
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error("not a file");
    size = stat.size;
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  const inline = isInlineType(upload.contentType);
  const headers: Record<string, string> = {
    // SVG・HTML など、開くとスクリプトが動く可能性がある種類は表示せずダウンロードさせる
    "Content-Type": inline ? upload.contentType : "application/octet-stream",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(upload.filename)}`,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    // PDF はブラウザ内蔵ビューア（それ自体がサンドボックス化されている）で開けるよう、sandbox を付けない
    ...(upload.contentType === "application/pdf"
      ? {}
      : { "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'" }),
    "Cache-Control": "private, max-age=3600",
  };

  const range = parseRange(rangeHeader, size);
  if (range === "unsatisfiable") {
    return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  }
  const { start, end } = range ?? { start: 0, end: size - 1 };
  const length = size === 0 ? 0 : end - start + 1;
  const body =
    length === 0
      ? null
      : (Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream<Uint8Array>);
  return new Response(body, {
    status: range ? 206 : 200,
    headers: {
      ...headers,
      "Content-Length": String(length),
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    },
  });
}
