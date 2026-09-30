import { RotateCcw, ShieldCheck, User as UserIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resetUserMfaAction } from "@/actions/users";
import { ConfirmButton } from "@/components/ConfirmButton";
import { UserForm } from "@/components/UserForm";
import { requireAccess } from "@/lib/access";
import { parseId } from "@/lib/params";
import { getUser } from "@/lib/users";

export const metadata: Metadata = { title: "ユーザーの編集" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess("admin");
  const user = getUser(parseId((await params).id));
  if (!user) notFound();

  return (
    <>
      <h1 className="page-title">
        <UserIcon size={26} aria-hidden /> ユーザーの編集
      </h1>
      <UserForm
        userId={user.id}
        initial={{ username: user.username, displayName: user.displayName ?? "", role: user.role, mustChangePassword: user.mustChangePassword }}
      />
      {user.mfaEnabled && (
        <section className="card danger-zone">
          <h2>
            <ShieldCheck size={18} aria-hidden /> 二段階認証
          </h2>
          <p>このユーザーは二段階認証を有効にしています。スマートフォンの紛失などでログインできなくなった場合はリセットしてください。</p>
          <ConfirmButton action={resetUserMfaAction.bind(null, user.id)} message="二段階認証をリセットしますか？" className="button button-danger">
            <RotateCcw size={18} aria-hidden />
            <span>二段階認証をリセット</span>
          </ConfirmButton>
        </section>
      )}
    </>
  );
}
