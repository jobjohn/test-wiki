import { ArrowLeft, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { safeNext } from "@/lib/access";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { ensureDefaultAdmin, hasUsers } from "@/lib/users";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "ログイン" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next) ?? "";
  if (await getCurrentUser()) redirect(next || "/");
  const settings = getSettings();
  // 環境変数が後から設定された場合も、ここで初期管理者を作る
  ensureDefaultAdmin();

  return (
    <>
      <LoginForm next={next} />
      {!hasUsers() && (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertTitle>初期管理者が作成されていません</AlertTitle>
          <AlertDescription>
            環境変数 WIKI_ADMIN_EMAIL（メールアドレス）と WIKI_ADMIN_PASSWORD（8 文字以上のパスワード）を設定して、起動し直してください。
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
