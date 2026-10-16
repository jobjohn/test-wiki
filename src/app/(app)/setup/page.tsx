import { Settings as SettingsIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageTitle } from "@/components/PageTitle";
import { SetupForm } from "@/components/SetupForm";
import { requireAccess } from "@/lib/access";

export const metadata: Metadata = { title: "初期設定" };

export default async function SetupPage() {
  const { user, settings } = await requireAccess("admin", { gate: false });
  if (settings.setupCompletedAt) redirect("/settings");

  return (
    <div className="grid max-w-3xl gap-4">
      <PageTitle icon={SettingsIcon}>初期設定</PageTitle>
      <p className="text-muted-foreground">Wiki の使い始めに必要な設定です。ここで設定した内容は、あとから「Wiki の設定」でいつでも変更できます。</p>
      <SetupForm
        mustChangePassword={!!user?.mustChangePassword}
        adminEmail={user?.email ?? ""}
        initial={{
          wikiName: settings.wikiName,
          description: settings.description ?? "",
        }}
      />
    </div>
  );
}
