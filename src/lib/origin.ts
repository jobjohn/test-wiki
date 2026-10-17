/** POST などの Route Handler で、別サイトからのリクエスト（CSRF）を拒否する */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** リバースプロキシの背後でも、利用者から見えているオリジン（例: https://wiki.example.com）を返す */
export function requestOrigin(headers: Headers, fallbackUrl?: string): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return fallbackUrl ? new URL(fallbackUrl).origin : "http://localhost:3000";
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwarded === "http" || forwarded === "https" ? forwarded : fallbackUrl ? new URL(fallbackUrl).protocol.replace(":", "") : "http";
  return `${proto}://${host}`;
}

/** Origin ヘッダーがあるとき、自サイトのものか（ヘッダーがなければ true。ブラウザ以外のクライアント用） */
export function isOwnOriginIfPresent(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
