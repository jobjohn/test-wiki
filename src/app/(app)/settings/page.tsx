import { Settings as SettingsIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageTitle } from "@/components/PageTitle";
import { SettingsForm } from "@/components/SettingsForm";
import { requireAccess } from "@/lib/access";

export const metadata: Metadata = { title: "一般設定" };

export default async function SettingsPage() {
  const { settings } = await requireAccess("admin");
  return (
    <div className="grid max-w-3xl gap-4">
      <PageTitle icon={SettingsIcon}>一般設定</PageTitle>
      <SettingsForm
        publicRead={settings.publicRead}
        requireMfa={settings.requireMfa}
        mcpWriteEnabled={settings.mcpWriteEnabled}
        initial={{
          wikiName: settings.wikiName,
          description: settings.description ?? "",
          colorMode: settings.colorMode,
        }}
      />
    </div>
  );
}
