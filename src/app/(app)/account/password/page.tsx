import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { PasswordForm } from "@/components/AccountForms";
import { PageTitle } from "@/components/PageTitle";
import { requireUser } from "@/lib/access";

export const metadata: Metadata = { title: "パスワードの変更" };

export default async function PasswordPage() {
  const { user } = await requireUser({ gate: false });
  return (
    <div className="grid gap-4">
      <PageTitle icon={KeyRound}>パスワードの変更</PageTitle>
      {user.mustChangePassword && <p className="text-muted-foreground">初回ログインのため、パスワードを変更してください。</p>}
      <PasswordForm cancelable={!user.mustChangePassword} />
    </div>
  );
}
