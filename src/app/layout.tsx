import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { getSettings } from "@/lib/settings";
import "@fontsource-variable/noto-sans-jp";
import "./globals.css";

// 設定・ログイン状態に応じて毎回描画する（ビルド時にデータベースへ接続しない）
export const dynamic = "force-dynamic";

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark" };

export function generateMetadata(): Metadata {
  const { wikiName } = getSettings();
  return { title: { default: wikiName, template: `%s - ${wikiName}` } };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const settings = getSettings();
  return (
    <html lang="ja" data-theme={settings.colorMode} suppressHydrationWarning>
      <body>
        {children}
        <Toaster position="bottom-right" closeButton />
      </body>
    </html>
  );
}
