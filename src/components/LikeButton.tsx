"use client";

import { Heart } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { setPageLikeAction } from "@/actions/likes";
import { Button } from "@/components/ui/button";
import type { PageLikes } from "@/lib/page-likes";
import { cn } from "@/lib/utils";

/**
 * ページの「いいね!」ボタン。押すとすぐ表示を切り替え（楽観的更新）、保存に失敗したら元に戻して通知する。
 * 未ログインの閲覧（ログインなしで閲覧を許可）では、数だけを表示して押せない
 */
export function LikeButton({ pageId, initial, canLike }: { pageId: number; initial: PageLikes; canLike: boolean }) {
  // 保存済みの状態（サーバーの返した数）。押している間だけ、その上に楽観的な表示を重ねる
  const [saved, setSaved] = useState(initial);
  const [likes, setOptimistic] = useOptimistic(saved, (_current, next: PageLikes) => next);
  const [, startTransition] = useTransition();

  const toggle = () => {
    const liked = !likes.liked;
    startTransition(async () => {
      setOptimistic({ liked, count: Math.max(0, likes.count + (liked ? 1 : -1)) });
      const result = await setPageLikeAction(pageId, liked);
      if ("error" in result) toast.error(result.error);
      else setSaved(result);
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={toggle}
      disabled={!canLike}
      aria-pressed={canLike ? likes.liked : undefined}
      aria-label={`いいね!（${likes.count} 件）`}
      title={canLike ? undefined : "ログインすると、いいね!できます"}
    >
      <Heart aria-hidden className={cn(likes.liked && "fill-primary text-primary")} />
      いいね!
      <span className="tabular-nums text-muted-foreground" data-testid="like-count">
        {likes.count}
      </span>
    </Button>
  );
}
