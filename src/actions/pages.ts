"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guardAction } from "@/lib/access";
import { NotFoundError, StaleError, ValidationError } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { type FormState, int, optionalId, positionField, str, values } from "@/lib/form";
import { createPage, getPage, restoreRevision, tagList, updatePage } from "@/lib/pages";
import { safePurge, TRASH_RETENTION_DAYS, trashPage } from "@/lib/trash";

const FIELDS = ["title", "body", "folderId", "position", "tags", "summary"];

export async function savePageAction(_prev: FormState, data: FormData): Promise<FormState> {
  const guard = await guardAction("edit");
  if ("error" in guard) return { errors: [guard.error] };

  const id = optionalId(data, "id");
  const input = {
    title: str(data, "title"),
    body: str(data, "body"),
    folderId: optionalId(data, "folderId"),
    position: int(data, "position"),
    tags: str(data, "tags"),
    summary: str(data, "summary"),
    userId: guard.user.id,
  };

  try {
    if (id === null) {
      const savedId = createPage(input);
      revalidatePath("/", "layout");
      await setFlash("notice", `ページ「${input.title.trim()}」を作成しました。`);
      redirect(`/pages/${savedId}`);
    }
    const { relinkedPages } = updatePage(id, input, int(data, "lockVersion", -1));
    revalidatePath("/", "layout");
    await setFlash("notice", relinkedPages ? `ページを更新しました。リンクしていた ${relinkedPages} ページのリンクも新しいタイトルに書き換えました。` : "ページを更新しました。");
    redirect(`/pages/${id}`);
  } catch (error) {
    if (error instanceof ValidationError) return { errors: error.messages, values: values(data, FIELDS) };
    if (error instanceof NotFoundError) {
      await setFlash("alert", "ページが見つかりません（削除された可能性があります）。");
      redirect("/");
    }
    if (error instanceof StaleError && id !== null) {
      const latest = getPage(id)!;
      return {
        errors: ["他のユーザーがこのページを先に更新しました。最新の内容を確認し、あなたの編集内容を反映してから保存してください。"],
        values: values(data, FIELDS),
        conflict: {
          yourBody: input.body,
          latest: {
            title: latest.title,
            body: latest.body,
            tags: tagList(id),
            folderId: latest.folderId === null ? "" : String(latest.folderId),
            position: positionField(latest.position),
            lockVersion: latest.lockVersion,
          },
        },
      };
    }
    throw error;
  }
}

export async function deletePageAction(id: number) {
  const guard = await guardAction("edit");
  if ("error" in guard) {
    await setFlash("alert", guard.error);
    redirect(`/pages/${id}`);
  }
  const page = getPage(id);
  if (page) {
    // 完全には消さず、ゴミ箱へ退避する（期限内なら元に戻せる）
    try {
      trashPage(id, guard.user.id);
      safePurge();
      revalidatePath("/", "layout");
      await setFlash("notice", `ページ「${page.title}」をゴミ箱に移動しました（${TRASH_RETENTION_DAYS} 日後に完全に削除されます）。`);
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error;
      await setFlash("alert", "ページが見つかりません（既に削除された可能性があります）。");
    }
  }
  redirect(page?.folderId ? `/folders/${page.folderId}` : "/");
}

export async function restoreRevisionAction(pageId: number, number: number) {
  const guard = await guardAction("edit");
  if ("error" in guard) {
    await setFlash("alert", guard.error);
    redirect(`/pages/${pageId}`);
  }
  try {
    const { relinkedPages } = restoreRevision(pageId, number, guard.user.id);
    revalidatePath("/", "layout");
    await setFlash(
      "notice",
      relinkedPages ? `第${number}版の内容に復元しました。リンクしていた ${relinkedPages} ページのリンクもこのタイトルに書き換えました。` : `第${number}版の内容に復元しました。`,
    );
    redirect(`/pages/${pageId}`);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      await setFlash("alert", error instanceof ValidationError ? `復元できませんでした: ${error.messages.join("、")}` : "版が見つかりません。");
      redirect(`/pages/${pageId}`);
    }
    throw error;
  }
}
