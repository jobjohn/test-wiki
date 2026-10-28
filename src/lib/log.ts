/**
 * 構造化ログ。1 行 1 件の JSON を標準出力（警告・エラーは標準エラー）へ書く。
 *
 * 秘密情報・個人情報を書かないこと。書いてよいのは、ユーザー ID・トークン ID・対象の ID・メールアドレスのハッシュ（emailHash）
 * ・ルートの型（/pages/[id] のような形。実際の URL やクエリは書かない）など。パスワード・トークン・メールアドレス・IP・本文は書かない。
 * 値は文字列・数値・真偽値・null に限り、文字列は長さを切り詰める（JSON にするので改行などで行が分かれることはない）。
 */
export type LogLevel = "info" | "warn" | "error";
export type LogValue = string | number | boolean | null | undefined;

const MAX_STRING = 500;

export function formatLog(level: LogLevel, event: string, fields: Record<string, LogValue> = {}, time = new Date()): string {
  const entry: Record<string, string | number | boolean | null> = { time: time.toISOString(), level, event };
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || key in entry) continue;
    entry[key] = typeof value === "string" && value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  return JSON.stringify(entry);
}

export function logEvent(level: LogLevel, event: string, fields: Record<string, LogValue> = {}) {
  const line = formatLog(level, event, fields);
  if (level === "info") console.log(line);
  else if (level === "warn") console.warn(line);
  else console.error(line);
}

/** 例外をログ用の値にする（スタックは 1 項目の文字列にまとめる） */
export function errorFields(error: unknown): Record<string, LogValue> {
  if (!(error instanceof Error)) return { errorName: typeof error, errorMessage: String(error) };
  return {
    errorName: error.name,
    errorMessage: error.message,
    digest: "digest" in error && typeof error.digest === "string" ? error.digest : undefined,
    stack: error.stack?.split("\n").slice(1, 8).map((line) => line.trim()).join(" | "),
  };
}
