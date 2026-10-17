import { KeyRound, Plug, ShieldCheck, Smartphone, User as UserIcon } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { MfaManage, ProfileForm } from "@/components/AccountForms";
import { ApiTokenForm, ApiTokenList, McpGuide } from "@/components/ApiTokens";
import { PageTitle } from "@/components/PageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/access";
import { listApiTokens, TOKEN_SCOPES, type TokenScope } from "@/lib/api-tokens";
import { formatDateTime } from "@/lib/format";
import { requestOrigin } from "@/lib/origin";
import { ROLES } from "@/lib/users";

export const metadata: Metadata = { title: "アカウント" };

function SectionTitle({ icon: Icon, children }: { icon: typeof UserIcon; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2">
      <Icon className="size-4" aria-hidden />
      {children}
    </CardTitle>
  );
}

export default async function AccountPage() {
  // 必須の手続き（パスワード変更・MFA 設定）へ案内する前でも、自分の設定は確認できるようにする
  const { user, settings } = await requireUser({ gate: false });
  const origin = requestOrigin(await headers());
  const nowIso = new Date().toISOString();
  // クライアントの部品へ渡すため、日付を整形した普通のオブジェクトにする
  const tokens = listApiTokens(user.id).map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    scope: TOKEN_SCOPES[t.scope as TokenScope] ?? t.scope,
    createdAt: formatDateTime(t.createdAt),
    lastUsedAt: t.lastUsedAt ? formatDateTime(t.lastUsedAt) : null,
    expiresAt: t.expiresAt ? formatDateTime(t.expiresAt) : null,
    expired: !!t.expiresAt && t.expiresAt <= nowIso,
  }));

  return (
    <div className="grid max-w-3xl gap-5">
      <PageTitle icon={UserIcon}>アカウント</PageTitle>

      <Card>
        <CardHeader>
          <SectionTitle icon={UserIcon}>プロフィール</SectionTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <dl className="grid grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">ロール</dt>
            <dd>
              <Badge variant={user.role === "admin" ? "highlight" : "secondary"}>{ROLES[user.role]}</Badge>
            </dd>
          </dl>
          <ProfileForm email={user.email} displayName={user.displayName ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle icon={KeyRound}>パスワード</SectionTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/account/password">
              <KeyRound aria-hidden />
              パスワードを変更
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle icon={ShieldCheck}>二段階認証（MFA）</SectionTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {user.mfaEnabled ? (
            <>
              <p>
                <Badge variant="success">
                  <ShieldCheck aria-hidden />
                  有効
                </Badge>
                {user.mfaEnabledAt && <span className="ml-2 text-sm text-muted-foreground">{formatDateTime(user.mfaEnabledAt)} から</span>}
              </p>
              <p className="text-sm text-muted-foreground">残りのバックアップコード: {user.remainingBackupCodes} 個</p>
              <MfaManage requireMfa={settings.requireMfa} />
            </>
          ) : (
            <>
              <p className="text-sm">
                ログイン時にパスワードに加えて、スマートフォンの認証アプリ（Google Authenticator、Microsoft Authenticator
                など）に表示されるパスコードを入力するようにできます。
              </p>
              <Button className="w-fit" asChild>
                <Link href="/account/mfa">
                  <Smartphone aria-hidden />
                  二段階認証を設定する
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle icon={Plug}>アクセストークン（MCP）</SectionTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <McpGuide origin={origin} />
          <ApiTokenForm origin={origin} />
          <ApiTokenList tokens={tokens} />
        </CardContent>
      </Card>
    </div>
  );
}
