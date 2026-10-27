/** リクエストごとの nonce（推測できない値） */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}

/**
 * 画面（HTML）向けの Content-Security-Policy。
 * スクリプトは nonce 付きのもの（Next.js が自動で付ける）とそこから読み込まれたものだけを許可する。
 * スタイルはコンポーネントが style 属性や <style> を使うため 'unsafe-inline' を許可する。
 * 画像は Markdown から外部の画像を貼れるため https: も許可する。
 */
export function contentSecurityPolicy(nonce: string, { dev = false, https = false } = {}): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/** CSP を付けないパス（API・ファイル配信は独自のヘッダーを返す） */
export const isCspExempt = (pathname: string) => /^\/(api|files|up)(\/|$)/.test(pathname);
