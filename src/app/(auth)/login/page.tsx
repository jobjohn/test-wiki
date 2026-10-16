import { ArrowLeft, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { safeNext } from "@/lib/access";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { defaultAdminEmail } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "ログイン" };

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
          <AlertDescription>
            <p>
              <strong>初回セットアップ</strong>
              <br />
              メールアドレス <Badge variant="outline">{defaultAdminEmail()}</Badge>
              {process.env.WIKI_ADMIN_PASSWORD ? (
                <>
                  {" "}
                  と環境変数 <Badge variant="outline">WIKI_ADMIN_PASSWORD</Badge> のパスワードでログインしてください。
                </>
              ) : (
                <>
                  {" "}
                  / パスワード <Badge variant="outline">wikiadmin</Badge> でログインしてください。
                </>
              )}
              ログイン後に初期設定とパスワード変更を行います。
            </p>
          </AlertDescription>
        </Alert>
      )}
      {settings.publicRead && (
        <Button variant="link" asChild className="h-auto p-0">
          <Link href="/">
            <ArrowLeft className="size-3.5" aria-hidden />
            ログインせずに閲覧する
          </Link>
        </Button>
      )}
    </>
  );
}
