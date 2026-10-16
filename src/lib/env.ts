import path from "node:path";

/** データ（SQLite・アップロードファイル・秘密鍵）の保存先 */
export function dataDir(): string {
  return process.env.WIKI_DATA_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "storage");
}

/** HTTPS で公開している場合（Cookie に Secure を付ける） */
export function isSecure(): boolean {
  return process.env.FORCE_SSL === "true";
}

export function timeZone(): string {
  return process.env.TZ || "Asia/Tokyo";
}

/** 初期管理者のメールアドレス（ログインに使う） */
export function defaultAdminEmail(): string {
  return (process.env.WIKI_ADMIN_EMAIL || "admin@example.com").trim();
}

export function defaultAdminPassword(): string {
  return process.env.WIKI_ADMIN_PASSWORD || "wikiadmin";
}

export function homePageTitle(): string {
  return process.env.WIKI_HOME_PAGE || "ホーム";
}
