"use client";

import "@fontsource-variable/noto-sans-jp";
import "./globals.css";
import { ErrorState } from "@/components/ErrorState";

// ルートレイアウト自体が失敗したときの最後の砦。独自に <html> と <body> を描く。
// 表示モードの設定はデータベースにあり、ここ（クライアントコンポーネント）からは読めない。
// ルートレイアウトの失敗はデータベースの不調が原因のこともあるため、あえて読みにも行かず、OS の配色に従う
// （data-theme="system"。設定が「ライト」「ダーク」でも、この画面だけは OS の配色になる）
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="ja" data-theme="system">
      <body>
        <title>エラーが発生しました</title>
        <main>
          <ErrorState error={error} retry={retry} />
        </main>
      </body>
    </html>
  );
}
