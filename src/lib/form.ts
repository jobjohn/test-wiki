/** サーバーアクションの戻り値（画面のフォームに表示する） */
export interface FormState {
  errors?: string[];
  /** 二段階認証を有効にしたときに 1 回だけ表示するバックアップコード */
  backupCodes?: string[];
  values?: Record<string, string>;
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

export const optionalId = (data: FormData, key: string): number | null => {
  const value = str(data, key).trim();
  return /^\d+$/.test(value) ? Number(value) : null;
};

export const bool = (data: FormData, key: string): boolean => data.get(key) === "on" || data.get(key) === "true";

export function values(data: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, str(data, k)]));
}
