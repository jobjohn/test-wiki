"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guardAction, safeNext } from "@/lib/access";
import { parseHttpUrl } from "@/lib/bookmark-utils";
import { createBookmark, findBookmarkByUrl, getBookmark, updateBookmark } from "@/lib/bookmarks";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { type FormState, optionalId, str, values } from "@/lib/form";
import { allowAttempt } from "@/lib/rate-limit";
import { safePurge, TRASH_RETENTION_DAYS, trashBookmark } from "@/lib/trash";
import { fetchUrlMetadata, UnsafeUrlError } from "@/lib/url-metadata";

const FIELDS = ["url", "title", "tags", "descriptionMd", "faviconUrl"];

/** リンクの登録・更新。成功したら notice を返す（ダイアログを閉じるのは画面側） */
export async function saveBookmarkAction(_prev: FormState, data: FormData): Promise<FormState> {
  const guard = await guardAction("edit");
  if ("error" in guard) return { errors: [guard.error] };

  const id = optionalId(data, "id");
  const input = {
    url: str(data, "url"),
    title: str(data, "title"),
    descriptionMd: str(data, "descriptionMd"),
    tags: str(data, "tags"),
    faviconUrl: str(data, "faviconUrl"),
    userId: guard.user.id,
  };

  try {
    if (id === null) createBookmark(input);
    else updateBookmark(id, input);
    const notice = id === null ? `リンク「${input.title.trim()}」を追加しました。` : "リンクを更新しました。";
    // 通知は画面共通の仕組み（フラッシュ）で出す。最初の 1 件の登録で空の表示が一覧に替わり、ダイアログが消えても通知が残るように
    await setFlash("notice", notice);
    revalidatePath("/bookmarks", "layout");
    return { notice };
  } catch (error) {
    if (error instanceof ValidationError) return { errors: error.messages, values: values(data, FIELDS) };
    if (error instanceof NotFoundError) return { errors: ["リンクが見つかりません（削除された可能性があります）。"], values: values(data, FIELDS) };
    throw error;
  }
}

/** リンクをゴミ箱へ移して、元の画面（一覧・詳細）へ戻る */
export async function deleteBookmarkAction(id: number, returnTo: string) {
  const back = safeNext(returnTo)?.startsWith("/bookmarks") ? returnTo : "/bookmarks";
  const guard = await guardAction("edit");
  if ("error" in guard) {
    await setFlash("alert", guard.error);
    redirect(back);
  }
  const bookmark = getBookmark(id);
  try {
    trashBookmark(id, guard.user.id);
    safePurge();
    revalidatePath("/bookmarks", "layout");
    await setFlash("notice", `リンク「${bookmark?.title ?? ""}」をゴミ箱に移動しました（${TRASH_RETENTION_DAYS} 日後に完全に削除されます）。`);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
    await setFlash("alert", "リンクが見つかりません（既に削除された可能性があります）。");
  }
  // 削除したリンクの詳細画面からは、一覧へ戻る
  redirect(back.startsWith(`/bookmarks/${id}`) ? "/bookmarks" : back);
}

export interface UrlMetadataResult {
  title?: string;
  favicon?: string;
  /** 同じ URL で登録済みのリンク */
  duplicate?: { id: number; title: string };
  error?: string;
}

/**
 * URL のタイトル・ファビコンを取得し、登録済みかどうかも調べる。
 * 外部サイトへはブラウザから直接ではなく、安全対策をしたサーバーからアクセスする。
 */
export async function fetchUrlMetadataAction(url: string, excludeId: number | null): Promise<UrlMetadataResult> {
  const guard = await guardAction("edit");
  if ("error" in guard) return { error: guard.error };
  if (typeof url !== "string" || !parseHttpUrl(url)) return { error: "URL は http:// または https:// で始まる正しい形式で入力してください" };

  const duplicate = findBookmarkByUrl(url, excludeId ?? undefined);
  if (!allowAttempt(`url-metadata:${guard.user.id}`, 30, 60_000)) return { duplicate, error: "しばらく待ってから、もう一度お試しください。" };
  try {
    const metadata = await fetchUrlMetadata(url);
    return { duplicate, title: metadata.title ?? undefined, favicon: metadata.favicon ?? undefined };
  } catch (error) {
    return {
      duplicate,
      error: error instanceof UnsafeUrlError ? "このURLからは情報を取得できません。タイトルを入力してください。" : "タイトルを取得できませんでした。手動で入力してください。",
    };
  }
}
