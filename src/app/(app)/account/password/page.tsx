import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { PasswordForm } from "@/components/AccountForms";
import { requireUser } from "@/lib/access";

export const metadata: Metadata = { title: "パスワードの変更" };

export default async function PasswordPage() {
  const { user } = await requireUser({ gate: false });
  return (
    <>
      <h1 className="page-title">
        <KeyRound size={26} aria-hidden /> パスワードの変更
      </h1>
      {user.mustChangePassword && <p className="muted">初回ログインのため、パスワードを変更してください。</p>}
      <PasswordForm cancelable={!user.mustChangePassword} />
    </>
  );
}
