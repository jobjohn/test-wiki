import { ArrowLeft, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { safeNext } from "@/lib/access";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { DEFAULT_ADMIN_USERNAME } from "@/lib/users";

export const metadata: Metadata = { title: "ログイン" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next) ?? "";
  if (await getCurrentUser()) redirect(next || "/");
  const settings = getSettings();

  return (
    <>
      <LoginForm next={next} />
      {!settings.setupCompletedAt && (
        <div className="notice-box">
          <Info size={18} aria-hidden />
          <div>
            <strong>初回セットアップ</strong>
            <br />
            ユーザー名 <code>{DEFAULT_ADMIN_USERNAME}</code>
            {process.env.WIKI_ADMIN_PASSWORD ? (
              <> と環境変数 <code>WIKI_ADMIN_PASSWORD</code> のパスワードでログインしてください。</>
            ) : (
              <> / パスワード <code>{DEFAULT_ADMIN_USERNAME}</code> でログインしてください。</>
            )}
            ログイン後に初期設定とパスワード変更を行います。
          </div>
        </div>
      )}
      {settings.publicRead && (
        <p className="auth-footer">
          <Link href="/">
            <ArrowLeft size={14} aria-hidden />
            ログインせずに閲覧する
          </Link>
        </p>
      )}
    </>
  );
}

