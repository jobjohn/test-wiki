import path from "node:path";

/** データ（SQLite・アップロードファイル・秘密鍵）の保存先 */
export function dataDir(): string {
  return process.env.WIKI_DATA_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "storage");
}

/** HTTPS で公開している場合（Cookie に Secure を付ける） */
export function isSecure(): boolean {
  return process.env.FORCE_SSL === "true";
}

/** リバースプロキシの背後にあり、X-Forwarded-For を信頼してよい場合 */
export function trustProxy(): boolean {
  return process.env.TRUST_PROXY === "true";
}

export function timeZone(): string {
  return process.env.TZ || "Asia/Tokyo";
}

/**
 * 初期管理者のメールアドレスとパスワード（環境変数 WIKI_ADMIN_EMAIL / WIKI_ADMIN_PASSWORD）。
 * 既定値は持たず、未設定や不正な値のときは null を返す（初期管理者を作らない）。
 */
export function initialAdminCredentials(): { email: string; password: string } | null {
  const email = (process.env.WIKI_ADMIN_EMAIL ?? "").trim();
  const password = process.env.WIKI_ADMIN_PASSWORD ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 72) return null;
  return { email, password };
}

export function homePageTitle(): string {
  return process.env.WIKI_HOME_PAGE || "ホーム";
}
