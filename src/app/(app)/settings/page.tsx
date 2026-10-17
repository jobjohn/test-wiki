import { ScrollText, Settings as SettingsIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { SettingsForm } from "@/components/SettingsForm";
import { Button } from "@/components/ui/button";
import { requireAccess } from "@/lib/access";

export const metadata: Metadata = { title: "Wiki の設定" };

export default async function SettingsPage() {
  const { settings } = await requireAccess("admin");
  return (
    <div className="grid max-w-3xl gap-4">
      <PageTitle icon={SettingsIcon}>Wiki の設定</PageTitle>
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
      <div>
        <Button variant="outline" asChild>
          <Link href="/settings/audit">
            <ScrollText aria-hidden />
            書き込みの記録を見る
          </Link>
        </Button>
        <p className="mt-1 text-sm text-muted-foreground">MCP からの書き込みの記録を確認できます（1 年間保持）。</p>
      </div>
    </div>
  );
}
