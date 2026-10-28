import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

/**
 * ファイルの URL に使う、推測できない鍵（144 ビット、URL にそのまま使える文字だけ）。
 * 連番の ID だけの URL では、閲覧できる人が番号を順にたどって全ファイルを見られてしまうため。
 */
export const newUploadAccessKey = () => randomBytes(18).toString("base64url");

/** 鍵の列を足したときに、既存のファイルへ鍵を割り当てる（既存の値・実ファイル・ページ本文は変えない） */
export function backfillUploadAccessKeys(db: DatabaseSync) {
  const rows = db.prepare("SELECT id FROM uploads WHERE access_key IS NULL").all() as { id: number }[];
  const update = db.prepare("UPDATE uploads SET access_key = ? WHERE id = ? AND access_key IS NULL");
  for (const { id } of rows) update.run(newUploadAccessKey(), id);
}
