"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** リンク集の表示中にエラーが起きたとき（検索・絞り込みを含む） */
export default function BookmarksError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden />
      <AlertTitle>リンク集を表示できませんでした</AlertTitle>
      <AlertDescription className="gap-3">
        <p>時間をおいて、もう一度お試しください。</p>
        <Button variant="outline" onClick={reset}>
          <RotateCw aria-hidden />
          再読み込み
        </Button>
      </AlertDescription>
    </Alert>
  );
}
