import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { all, get, run } from "./db";
import { dataDir } from "./env";
import { ValidationError } from "./errors";
import { now } from "./text";

export const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

export interface Upload {
  id: number;
  filename: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  createdAt: string;
}

interface UploadRow {
  id: number;
  filename: string;
  content_type: string;
  byte_size: number;
  storage_key: string;
  created_at: string;
}

const mapUpload = (row: UploadRow): Upload => ({
  id: row.id,
  filename: row.filename,
  contentType: row.content_type,
  byteSize: row.byte_size,
  storageKey: row.storage_key,
  createdAt: row.created_at,
});

const filesDir = () => path.join(dataDir(), "files");

/** ブラウザ上でそのまま表示してよい種類（スクリプトを含み得る SVG / HTML は含めない） */
const INLINE_TYPES = /^(image\/(png|jpeg|gif|webp|avif|bmp)|application\/pdf|text\/plain|video\/(mp4|webm)|audio\/(mpeg|ogg|wav))$/;
export const isInlineType = (contentType: string) => INLINE_TYPES.test(contentType);
export const isImage = (contentType: string) => /^image\/(png|jpeg|gif|webp|avif|bmp)$/.test(contentType);

export function getUpload(id: number): Upload | undefined {
  const row = get<UploadRow>("SELECT * FROM uploads WHERE id = ?", id);
  return row && mapUpload(row);
}

export const listUploads = (limit = 200): Upload[] =>
  all<UploadRow>("SELECT * FROM uploads ORDER BY created_at DESC, id DESC LIMIT ?", limit).map(mapUpload);

export function uploadPath(upload: Upload): string {
  return `/files/${upload.id}/${encodeURIComponent(upload.filename)}`;
}

export function uploadMarkdown(upload: Upload): string {
  const label = upload.filename.replace(/[\[\]]/g, "");
  return `${isImage(upload.contentType) ? "!" : ""}[${label}](${uploadPath(upload)})`;
}

export function readUploadFile(upload: Upload): Buffer {
  return fs.readFileSync(path.join(filesDir(), upload.storageKey));
}

/** ファイルを保存して DB に登録する */
export async function storeUpload(file: File, userId: number | null): Promise<Upload> {
  if (!file || file.size === 0) throw new ValidationError("ファイルを選択してください");
  if (file.size > MAX_UPLOAD_SIZE) throw new ValidationError(`ファイルは ${MAX_UPLOAD_SIZE / 1024 / 1024}MB 以下にしてください`);

  const key = randomBytes(16).toString("hex");
  fs.mkdirSync(filesDir(), { recursive: true });
  fs.writeFileSync(path.join(filesDir(), key), Buffer.from(await file.arrayBuffer()), { mode: 0o600 });

  const filename = (file.name || "file").replace(/[\\/\x00-\x1f]/g, "_").slice(0, 200) || "file";
  const id = run(
    "INSERT INTO uploads (filename, content_type, byte_size, storage_key, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    filename,
    file.type || "application/octet-stream",
    file.size,
    key,
    userId,
    now(),
  ).lastInsertRowid;
  return getUpload(id)!;
}

export function deleteUpload(id: number) {
  const upload = getUpload(id);
  if (!upload) return;
  run("DELETE FROM uploads WHERE id = ?", id);
  fs.rmSync(path.join(filesDir(), upload.storageKey), { force: true });
}
