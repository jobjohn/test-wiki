import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { MfaSetupForm } from "@/components/MfaSetupForm";
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
    <>
      <h1 className="page-title">
        <ShieldCheck size={26} aria-hidden /> 二段階認証の設定
      </h1>
      {settings.requireMfa && <p className="muted">この Wiki では二段階認証の設定が必須です。設定が完了するまで、他の画面は利用できません。</p>}
      <MfaSetupForm secret={secret} qrSvg={qrSvg} />
      {!settings.requireMfa && (
        <p>
          <Link href="/account">
            <ArrowLeft size={14} aria-hidden /> アカウントに戻る
          </Link>
        </p>
      )}
    </>
  );
}
