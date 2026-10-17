// 画面（クライアントコンポーネント）からも使うため、データベースに依存しない定数だけを置く

export const TOKEN_NAME_MAX_LENGTH = 50;
export const TOKEN_LIMIT_PER_USER = 20;

/** 有効期限の選択肢（days が null なら無期限） */
export const TOKEN_EXPIRIES = {
  "30": { label: "30 日", days: 30 },
  "90": { label: "90 日", days: 90 },
  "365": { label: "1 年", days: 365 },
  never: { label: "無期限", days: null },
} as const;
export type TokenExpiry = keyof typeof TOKEN_EXPIRIES;
export const DEFAULT_TOKEN_EXPIRY: TokenExpiry = "90";
export const isTokenExpiry = (value: string): value is TokenExpiry => Object.hasOwn(TOKEN_EXPIRIES, value);

/** 権限の種類。今は読み取りだけを発行する（将来 write を足せるように文字列で持つ） */
export const TOKEN_SCOPES = { read: "読み取り" } as const;
export type TokenScope = keyof typeof TOKEN_SCOPES;

/** 画面に出すトークンの情報（ハッシュは含めない） */
export interface ApiTokenSummary {
  id: number;
  name: string;
  prefix: string;
  scope: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}
