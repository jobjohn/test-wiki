import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { PageTitle } from "@/components/PageTitle";
import { UserForm } from "@/components/UserForm";
import { requireAccess } from "@/lib/access";

export const metadata: Metadata = { title: "ユーザーを追加" };

export default async function NewUserPage() {
  await requireAccess("admin");
  return (
    <div className="grid max-w-2xl gap-5">
      <PageTitle icon={UserPlus}>ユーザーを追加</PageTitle>
      <UserForm userId={null} initial={{ username: "", displayName: "", role: "editor", mustChangePassword: true }} />
    </div>
  );
}
