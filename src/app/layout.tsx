import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { cssVariables, getSettings } from "@/lib/settings";
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
      <head>
        {/* 色は #rrggbb 形式に検証済みの値のみ */}
        <style id="theme-variables" dangerouslySetInnerHTML={{ __html: `:root { ${cssVariables(settings)} }` }} />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" closeButton />
      </body>
    </html>
  );
}
