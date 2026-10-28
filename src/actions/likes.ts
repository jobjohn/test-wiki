"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/access";
import { NotFoundError } from "@/lib/errors";
import { type PageLikes, setPageLike } from "@/lib/page-likes";

/** ページのいいね!を付ける・外す（ログインしている人なら誰でも）。結果の数を返す */
export async function setPageLikeAction(pageId: number, liked: boolean): Promise<PageLikes | { error: string }> {
  const guard = await guardAction("read");
  if ("error" in guard) return { error: guard.error };
  try {
    const result = setPageLike(pageId, guard.user.id, liked);
    revalidatePath(`/pages/${pageId}`);
    return result;
  } catch (error) {
    if (error instanceof NotFoundError) return { error: "ページが見つかりません（削除された可能性があります）。" };
    throw error;
  }
}
