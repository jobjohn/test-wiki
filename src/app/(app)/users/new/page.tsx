import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { UserForm } from "@/components/UserForm";
import { requireAccess } from "@/lib/access";

export const metadata: Metadata = { title: "ユーザーを追加" };

export default async function NewUserPage() {
  await requireAccess("admin");
  return (
    <>
      <h1 className="page-title">
        <UserPlus size={26} aria-hidden /> ユーザーを追加
      </h1>
      <UserForm userId={null} initial={{ username: "", displayName: "", role: "editor", mustChangePassword: true }} />
    </>
  );
}
