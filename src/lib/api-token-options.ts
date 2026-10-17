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

/** 権限の種類。write は管理者が「MCP からの書き込みを許可」したときだけ発行できる */
export const TOKEN_SCOPES = { read: "読み取り", write: "読み取り・書き込み" } as const;
export type TokenScope = keyof typeof TOKEN_SCOPES;
export const DEFAULT_TOKEN_SCOPE: TokenScope = "read";
export const isTokenScope = (value: string): value is TokenScope => Object.hasOwn(TOKEN_SCOPES, value);

/** 書き込みトークンは漏れたときの被害が大きいので、無期限にはできない */
export const isWritableExpiry = (expiry: TokenExpiry): boolean => TOKEN_EXPIRIES[expiry].days !== null;

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
