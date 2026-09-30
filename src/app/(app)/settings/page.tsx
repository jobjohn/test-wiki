import { Settings as SettingsIcon } from "lucide-react";
import type { Metadata } from "next";
import { SettingsForm } from "@/components/SettingsForm";
import { requireAccess } from "@/lib/access";
import { currentThemeKey } from "@/lib/settings";

export const metadata: Metadata = { title: "Wiki の設定" };

export default async function SettingsPage() {
  const { settings } = await requireAccess("admin");
  return (
    <>
      <h1 className="page-title">
        <SettingsIcon size={26} aria-hidden /> Wiki の設定
      </h1>
      <SettingsForm
        publicRead={settings.publicRead}
        requireMfa={settings.requireMfa}
        initial={{
          wikiName: settings.wikiName,
          description: settings.description ?? "",
          theme: currentThemeKey(settings),
          colors: { primary: settings.primaryColor, secondary: settings.secondaryColor, accent: settings.accentColor },
          colorMode: settings.colorMode,
        }}
      />
    </>
  );
}
