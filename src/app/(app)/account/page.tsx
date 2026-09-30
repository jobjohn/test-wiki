import { KeyRound, ShieldCheck, Smartphone, User as UserIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MfaManage, ProfileForm } from "@/components/AccountForms";
import { requireUser } from "@/lib/access";
import { formatDateTime } from "@/lib/format";
import { ROLES } from "@/lib/users";

export const metadata: Metadata = { title: "アカウント" };

export default async function AccountPage() {
  // 必須の手続き（パスワード変更・MFA 設定）へ案内する前でも、自分の設定は確認できるようにする
  const { user, settings } = await requireUser({ gate: false });

  return (
    <>
      <h1 className="page-title">
        <UserIcon size={26} aria-hidden /> アカウント
      </h1>

      <section className="card">
        <h2>
          <UserIcon size={18} aria-hidden /> プロフィール
        </h2>
        <dl className="meta-list">
          <dt>ユーザー名</dt>
          <dd>
            <code>{user.username}</code>
          </dd>
          <dt>権限</dt>
          <dd>
            <span className={`badge badge-${user.role}`}>{ROLES[user.role]}</span>
          </dd>
        </dl>
        <ProfileForm displayName={user.displayName ?? ""} />
      </section>

      <section className="card">
        <h2>
          <KeyRound size={18} aria-hidden /> パスワード
        </h2>
        <Link href="/account/password" className="button">
          <KeyRound size={18} aria-hidden />
          <span>パスワードを変更</span>
        </Link>
      </section>

      <section className="card">
        <h2>
          <ShieldCheck size={18} aria-hidden /> 二段階認証（MFA）
        </h2>
        {user.mfaEnabled ? (
          <>
            <p className="status-on">
              <ShieldCheck size={16} aria-hidden /> 有効{user.mfaEnabledAt && `（${formatDateTime(user.mfaEnabledAt)} から）`}
            </p>
            <p className="muted small">残りのバックアップコード: {user.remainingBackupCodes} 個</p>
            <MfaManage requireMfa={settings.requireMfa} />
          </>
        ) : (
          <>
            <p>
              ログイン時にパスワードに加えて、スマートフォンの認証アプリ（Google Authenticator、Microsoft Authenticator など）に表示されるパスコードを入力するようにできます。
            </p>
            <Link href="/account/mfa" className="button button-primary">
              <Smartphone size={18} aria-hidden />
              <span>二段階認証を設定する</span>
            </Link>
          </>
        )}
      </section>
    </>
  );
}
