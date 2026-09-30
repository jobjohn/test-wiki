import { RotateCcw, ShieldCheck, User as UserIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resetUserMfaAction } from "@/actions/users";
import { ConfirmAction } from "@/components/ConfirmAction";
import { PageTitle } from "@/components/PageTitle";
import { UserForm } from "@/components/UserForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccess } from "@/lib/access";
import { parseId } from "@/lib/params";
import { getUser } from "@/lib/users";

export const metadata: Metadata = { title: "ユーザーの編集" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess("admin");
  const user = getUser(parseId((await params).id));
  if (!user) notFound();

  return (
    <div className="grid max-w-2xl gap-5">
      <PageTitle icon={UserIcon}>ユーザーの編集</PageTitle>
      <UserForm
        userId={user.id}
        initial={{ username: user.username, displayName: user.displayName ?? "", role: user.role, mustChangePassword: user.mustChangePassword }}
      />
      {user.mfaEnabled && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-[18px] text-primary" aria-hidden />
              二段階認証
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm">このユーザーは二段階認証を有効にしています。スマートフォンの紛失などでログインできなくなった場合はリセットしてください。</p>
            <ConfirmAction
              action={resetUserMfaAction.bind(null, user.id)}
              title="二段階認証をリセットしますか？"
              description={`ユーザー「${user.username}」の二段階認証を解除します。本人が再度設定するまで、パスワードだけでログインできる状態になります。`}
              confirmLabel="リセットする"
              destructive
              trigger={
                <Button variant="outline" className="w-fit text-destructive hover:text-destructive">
                  <RotateCcw aria-hidden />
                  二段階認証をリセット
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
