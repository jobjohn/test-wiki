"use client";

import "@fontsource-variable/noto-sans-jp";
import "./globals.css";
import { ErrorState } from "@/components/ErrorState";

// ルートレイアウト自体が失敗したときの最後の砦。独自に <html> と <body> を描く
// （設定の配色は読めないため OS の配色に従う）
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="ja" data-theme="system">
      <body>
        <title>エラーが発生しました</title>
        <ErrorState error={error} retry={retry} />
      </body>
    </html>
  );
}
