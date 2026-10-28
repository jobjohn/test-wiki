/** サーバーアクションの戻り値（画面のフォームに表示する） */
export interface FormState {
  errors?: string[];
  /** 二段階認証を有効にしたときに 1 回だけ表示するバックアップコード */
  backupCodes?: string[];
  /** アクセストークンを発行したときに 1 回だけ表示する平文 */
  token?: { name: string; value: string };
  values?: Record<string, string>;
  /** 保存に成功したときに画面へ出すメッセージ（ダイアログ内のフォームなど、画面を移動しない場合） */
  notice?: string;
  /** 編集の競合が起きたときの情報 */
  conflict?: { yourBody: string; latest: { title: string; body: string; tags: string; folderId: string; position: string; lockVersion: number } };
}

export const str = (data: FormData, key: string): string => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

export const int = (data: FormData, key: string, fallback = 0): number => {
  const value = str(data, key).trim();
  return /^-?\d+$/.test(value) ? Number(value) : value === "" ? fallback : NaN;
};

/**
 * 表示順の入力欄に出す値。既定の 0 は「お任せ（タイトル順）」として空欄で表示する。
 * 空欄で送ると int() が 0 として受け取るので、保存される値は今までと変わらない
 */
export const PAGE_POSITION_PLACEHOLDER = "お任せ（タイトル順）";
export const FOLDER_POSITION_PLACEHOLDER = "お任せ（名前順）";
export const positionField = (position: number): string => (position === 0 ? "" : String(position));

export const optionalId = (data: FormData, key: string): number | null => {
  const value = str(data, key).trim();
  return /^\d+$/.test(value) ? Number(value) : null;
};

export const bool = (data: FormData, key: string): boolean => data.get(key) === "on" || data.get(key) === "true";

export function values(data: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, str(data, k)]));
}
