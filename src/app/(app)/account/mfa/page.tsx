import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { MfaSetupForm } from "@/components/MfaSetupForm";
import { PageTitle } from "@/components/PageTitle";
import { requireUser } from "@/lib/access";
import { otpauthUri } from "@/lib/totp";
import { pendingMfaSecret } from "@/lib/users";

export const metadata: Metadata = { title: "二段階認証の設定" };

export default async function MfaSetupPage() {
  const { user, settings } = await requireUser({ gate: false });
  if (user.mfaEnabled) redirect("/account");

  const secret = pendingMfaSecret(user.id);
  const uri = otpauthUri(secret, user.username, settings.wikiName);
  const qrSvg = await QRCode.toString(uri, { type: "svg", margin: 1 });

  return (
    <div className="grid gap-4">
      <PageTitle icon={ShieldCheck}>二段階認証の設定</PageTitle>
      {settings.requireMfa && <p className="text-muted-foreground">この Wiki では二段階認証の設定が必須です。設定が完了するまで、他の画面は利用できません。</p>}
      <MfaSetupForm secret={secret} qrSvg={qrSvg} />
      {!settings.requireMfa && (
        <Link href="/account" className="inline-flex w-fit items-center gap-1 text-sm text-link hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden /> アカウントに戻る
        </Link>
      )}
    </div>
  );
}
