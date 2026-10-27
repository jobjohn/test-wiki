"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

// サーバー側のエラーは本文を伏せて digest（サーバーログとの照合用 ID）だけが届く
function digestOf(error: unknown): string | undefined {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") return error.digest;
  return undefined;
}

export function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = digestOf(error);

  return (
    <Empty className="mx-auto my-16 max-w-md">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert aria-hidden />
        </EmptyMedia>
        <EmptyTitle>エラーが発生しました</EmptyTitle>
        <EmptyDescription>
          ページを表示できませんでした。時間をおいてもう一度お試しください。
          {digest && (
            <>
              <br />
              <span className="font-mono text-xs">エラー ID: {digest}</span>
            </>
          )}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button onClick={() => retry()}>
          <RotateCcw aria-hidden />
          再試行
        </Button>
        <Button variant="outline" asChild>
          {/* エラー状態のルーターを使わず、ページを読み込み直してホームへ戻す */}
          <a href="/">ホームに戻る</a>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
