import { Settings as SettingsIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageTitle } from "@/components/PageTitle";
import { SettingsForm } from "@/components/SettingsForm";
import { requireAccess } from "@/lib/access";
import { currentThemeKey } from "@/lib/settings";

export const metadata: Metadata = { title: "Wiki の設定" };

export default async function SettingsPage() {
  const { settings } = await requireAccess("admin");
  return (
    <div className="grid max-w-3xl gap-4">
      <PageTitle icon={SettingsIcon}>Wiki の設定</PageTitle>
      <SettingsForm
        publicRead={settings.publicRead}
        requireMfa={settings.requireMfa}
        initial={{
          wikiName: settings.wikiName,
          description: settings.description ?? "",
          theme: currentThemeKey(settings),
          colors: { primaryColor: settings.primaryColor, secondaryColor: settings.secondaryColor, accentColor: settings.accentColor },
          colorMode: settings.colorMode,
        }}
      />
    </div>
  );
}
