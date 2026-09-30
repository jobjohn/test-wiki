import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import { getSettings, type Settings } from "./settings";
import { canEdit, isAdmin, type User } from "./users";

export type Level = "viewer" | "editor" | "admin";

/** ログイン後に戻る先として使える、サイト内のパスだけを通す */
export function safeNext(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

async function currentPath(): Promise<string | null> {
  return safeNext((await headers()).get("x-wiki-path"));
}

/** 初期設定・初回パスワード変更・MFA 必須設定を満たすまで、他の画面を使わせない */
export function pendingRequirement(user: User, settings: Settings): string | null {
  if (isAdmin(user) && !settings.setupCompletedAt) return "/setup";
  if (user.mustChangePassword) return "/account/password";
  if (settings.requireMfa && !user.mfaEnabled) return "/account/mfa";
  return null;
}

export interface Access {
  user: User | null;
  settings: Settings;
}

/**
 * ページの先頭で呼ぶアクセス制御。
 * - viewer: 閲覧（「ログインなしで閲覧を許可」が有効なら未ログインでも可）
 * - editor / admin: 該当する権限のログインが必要
 * - gate: false にすると、初期設定などの必須手続きへの誘導を行わない（その手続きの画面用）
 */
export async function requireAccess(level: Level = "viewer", options: { gate?: boolean } = {}): Promise<Access & { user: User | null }> {
  const settings = getSettings();
  const user = await getCurrentUser();

  if (!user) {
    if (level === "viewer" && settings.publicRead) return { user: null, settings };
    const next = await currentPath();
    redirect(next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }

  if (options.gate !== false) {
    const requirement = pendingRequirement(user, settings);
    if (requirement) redirect(requirement);
  }
  if ((level === "editor" && !canEdit(user)) || (level === "admin" && !isAdmin(user))) redirect("/");
  return { user, settings };
}

/** ログイン済みであることだけを求める（権限不問） */
export async function requireUser(options: { gate?: boolean } = {}): Promise<{ user: User; settings: Settings }> {
  const access = await requireAccess("viewer", options);
  if (!access.user) redirect("/login");
  return { user: access.user, settings: access.settings };
}

/** サーバーアクション用のアクセス制御。権限が足りない場合は画面に出すメッセージを返す */
export async function guardAction(level: Level, options: { gate?: boolean } = {}): Promise<{ user: User } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (options.gate !== false && pendingRequirement(user, getSettings())) {
    return { error: "先に、必須の設定（初期設定・パスワード変更・二段階認証）を完了してください。" };
  }
  if ((level === "editor" && !canEdit(user)) || (level === "admin" && !isAdmin(user))) {
    return { error: "この操作を行う権限がありません。" };
  }
  return { user };
}

/** メタデータ（ページタイトル）を見せてよいか。未ログインの人に非公開ページのタイトルを漏らさないため */
export async function canViewContent(): Promise<boolean> {
  return !!(await getCurrentUser()) || getSettings().publicRead;
}
