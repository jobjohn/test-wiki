import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { all, get, run } from "./db";
import { dataDir } from "./env";
import { ValidationError } from "./errors";
import { now } from "./text";
import { newUploadAccessKey } from "./upload-keys";

export const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

export interface Upload {
  id: number;
  filename: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  /** URL 用の推測できない鍵（移行処理で全件に割り当てる。念のため無い場合は番号の URL を使う） */
  accessKey: string | null;
  createdAt: string;
}

interface UploadRow {
  id: number;
  filename: string;
  content_type: string;
  byte_size: number;
  storage_key: string;
  access_key: string | null;
  created_at: string;
}

const mapUpload = (row: UploadRow): Upload => ({
  id: row.id,
  filename: row.filename,
  contentType: row.content_type,
  byteSize: row.byte_size,
  storageKey: row.storage_key,
  accessKey: row.access_key,
  createdAt: row.created_at,
});

const filesDir = () => path.join(dataDir(), "files");

/** ブラウザ上でそのまま表示してよい種類（スクリプトを含み得る SVG / HTML は含めない） */
const INLINE_TYPES = /^(image\/(png|jpeg|gif|webp|avif|bmp)|application\/pdf|text\/plain|video\/(mp4|webm)|audio\/(mpeg|ogg|wav))$/;
export const isInlineType = (contentType: string) => INLINE_TYPES.test(contentType);
export const isImage = (contentType: string) => /^image\/(png|jpeg|gif|webp|avif|bmp)$/.test(contentType);

/** 番号から探す（/files/<id>/<name> の古い形式の URL 用） */
export function getUpload(id: number): Upload | undefined {
  const row = get<UploadRow>("SELECT * FROM uploads WHERE id = ?", id);
  return row && mapUpload(row);
}

/** 鍵から探す（/files/k/<鍵>/<name> の URL 用） */
export function getUploadByAccessKey(key: string): Upload | undefined {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(key)) return undefined;
  const row = get<UploadRow>("SELECT * FROM uploads WHERE access_key = ?", key);
  return row && mapUpload(row);
}

/**
 * ファイルがどこかから参照されているか（SQL の条件式。uploads を u として使う）。
 * 今のページ本文・リンク集の説明・ゴミ箱の中身（戻したときに必要になるため）を見る。過去の版だけからの参照は数えない。
 * 鍵の URL（/files/k/<鍵>/）と古い番号の URL（/files/<id>/）の両方を探す。
 * `/files/12/` の形で探すので、`/files/123/` を 12 番の参照と取り違えることはない。
 */
const referencedIn = (column: string) =>
  `(instr(${column}, '/files/' || u.id || '/') > 0 OR (u.access_key IS NOT NULL AND instr(${column}, '/files/k/' || u.access_key || '/') > 0))`;
const REFERENCED_SQL = `(
  EXISTS (SELECT 1 FROM pages p WHERE ${referencedIn("p.body")})
  OR EXISTS (SELECT 1 FROM bookmarks b WHERE ${referencedIn("b.description_md")})
  OR EXISTS (SELECT 1 FROM trash_items t WHERE t.kind <> 'upload' AND ${referencedIn("t.payload")})
)`;

export type UploadFilter = "all" | "unreferenced";
export const isUploadFilter = (value: string): value is UploadFilter => value === "all" || value === "unreferenced";

export interface UploadListItem extends Upload {
  referenced: boolean;
}

/** ファイル一覧（新しい順）。unreferenced ならどこからも参照されていないものだけ */
export function listUploads({ filter = "all", limit = 50, offset = 0 }: { filter?: UploadFilter; limit?: number; offset?: number } = {}): {
  uploads: UploadListItem[];
  total: number;
} {
  const where = filter === "unreferenced" ? `WHERE NOT ${REFERENCED_SQL}` : "";
  const rows = all<UploadRow & { referenced: number }>(
    `SELECT u.*, ${REFERENCED_SQL} AS referenced FROM uploads u ${where} ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?`,
    limit,
    offset,
  );
  const total = get<{ count: number }>(`SELECT COUNT(*) AS count FROM uploads u ${where}`)!.count;
  return { uploads: rows.map((row) => ({ ...mapUpload(row), referenced: !!row.referenced })), total };
}

/**
 * ファイルの URL。新しく貼るリンクは推測できない鍵の形（/files/k/<鍵>/<名前>）にする。
 * 以前の番号の形（/files/<id>/<名前>）も、既にページへ貼られたリンクを壊さないよう引き続き使える。
 */
export function uploadPath(upload: Upload): string {
  const name = encodeURIComponent(upload.filename);
  return upload.accessKey ? `/files/k/${upload.accessKey}/${name}` : `/files/${upload.id}/${name}`;
}

export function uploadMarkdown(upload: Upload): string {
  const label = upload.filename.replace(/[\[\]]/g, "");
  return `${isImage(upload.contentType) ? "!" : ""}[${label}](${uploadPath(upload)})`;
}

export function uploadFilePath(upload: Upload): string {
  return path.join(filesDir(), upload.storageKey);
}

const tooLarge = () => new ValidationError(`ファイルは ${MAX_UPLOAD_SIZE / 1024 / 1024}MB 以下にしてください`);

const safeFilename = (name: string) => (name || "file").replace(/[\\/\x00-\x1f]/g, "_").slice(0, 200) || "file";

/** ファイルを保存して DB に登録する（フォームから受け取った File 用） */
export async function storeUpload(file: File, userId: number | null): Promise<Upload> {
  if (!file || file.size === 0) throw new ValidationError("ファイルを選択してください");
  if (file.size > MAX_UPLOAD_SIZE) throw tooLarge();
  return storeUploadStream({ stream: file.stream(), filename: file.name, contentType: file.type, expectedSize: file.size }, userId);
}

/**
 * 受け取ったデータを少しずつディスクに書きながら保存して DB に登録する（全体をメモリに載せない）。
 * 上限を超えた時点で中断し、expectedSize（Content-Length）と実際のバイト数が合わなければ、途中で切れたものとして保存しない。
 */
export async function storeUploadStream(
  { stream, filename, contentType, expectedSize }: { stream: ReadableStream<Uint8Array>; filename: string; contentType: string; expectedSize?: number },
  userId: number | null,
): Promise<Upload> {
  if (expectedSize !== undefined && expectedSize > MAX_UPLOAD_SIZE) throw tooLarge();

  const key = randomBytes(16).toString("hex");
  fs.mkdirSync(filesDir(), { recursive: true });
  let id: number | bigint;
  try {
    let size = 0;
    const counter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        size += chunk.length;
        callback(size > MAX_UPLOAD_SIZE ? tooLarge() : null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(stream as WebReadableStream<Uint8Array>), counter, fs.createWriteStream(path.join(filesDir(), key), { mode: 0o600 }));
    if (size === 0) throw new ValidationError("ファイルを選択してください");
    if (expectedSize !== undefined && size !== expectedSize) throw new ValidationError("ファイルを最後まで受け取れませんでした。もう一度アップロードしてください");
    id = run(
      "INSERT INTO uploads (filename, content_type, byte_size, storage_key, access_key, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      safeFilename(filename),
      contentType || "application/octet-stream",
      size,
      key,
      newUploadAccessKey(),
      userId,
      now(),
    ).lastInsertRowid;
  } catch (error) {
    // 書きかけ・登録できなかったファイルを残さない（どこからも参照されないゴミになるため）
    removeUploadFile(key);
    throw error;
  }
  return getUpload(id)!;
}

/** 保存済みの実ファイルを消す（既になくてもよい） */
export function removeUploadFile(storageKey: string) {
  // 保存先の外を指すキーは扱わない（退避データが書き換えられていても、他のファイルを消さないため）
  if (!storageKey || path.basename(storageKey) !== storageKey) return;
  fs.rmSync(path.join(filesDir(), storageKey), { force: true });
}

export function deleteUpload(id: number) {
  const upload = getUpload(id);
  if (!upload) return;
  run("DELETE FROM uploads WHERE id = ?", id);
  removeUploadFile(upload.storageKey);
}
