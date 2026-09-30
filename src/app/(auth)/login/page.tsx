import { ArrowLeft, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { safeNext } from "@/lib/access";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { DEFAULT_ADMIN_USERNAME } from "@/lib/users";

export const metadata: Metadata = { title: "ログイン" };

const code = "rounded bg-muted px-1 font-mono text-xs";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next) ?? "";
  if (await getCurrentUser()) redirect(next || "/");
  const settings = getSettings();

  return (
    <>
      <LoginForm next={next} />
      {!settings.setupCompletedAt && (
        <Alert variant="warning">
          <Info aria-hidden />
          <AlertDescription className="text-foreground">
            <p>
              <strong>初回セットアップ</strong>
              <br />
              ユーザー名 <code className={code}>{DEFAULT_ADMIN_USERNAME}</code>
              {process.env.WIKI_ADMIN_PASSWORD ? (
                <>
                  {" "}
                  と環境変数 <code className={code}>WIKI_ADMIN_PASSWORD</code> のパスワードでログインしてください。
                </>
              ) : (
                <>
                  {" "}
                  / パスワード <code className={code}>{DEFAULT_ADMIN_USERNAME}</code> でログインしてください。
                </>
              )}
              ログイン後に初期設定とパスワード変更を行います。
            </p>
          </AlertDescription>
        </Alert>
      )}
      {settings.publicRead && (
        <Link href="/" className="inline-flex items-center justify-center gap-1 text-sm text-link hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden />
          ログインせずに閲覧する
        </Link>
      )}
    </>
  );
}
