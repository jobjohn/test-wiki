"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guardAction } from "@/lib/access";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { TRASH_KIND_LABELS } from "@/lib/trash-utils";
import { emptyTrash, purgeTrashItem, restoreTrashItem } from "@/lib/trash";

const MISSING = "ゴミ箱に見つかりません（既に復元・削除された可能性があります）。";

/** ゴミ箱の項目を元に戻す。同じタイトル・URL があるときは理由を表示して断る */
export async function restoreTrashAction(id: number) {
  const guard = await guardAction("edit");
  if ("error" in guard) await setFlash("alert", guard.error);
  else {
    try {
      const item = restoreTrashItem(id);
      // サイドバー・一覧などすべての画面に反映する
      revalidatePath("/", "layout");
      await setFlash("notice", `${TRASH_KIND_LABELS[item.kind]}「${item.title}」を元に戻しました。`, { href: item.href, label: "開く" });
    } catch (error) {
      if (error instanceof ValidationError) await setFlash("alert", error.messages.join("、"));
      else if (error instanceof NotFoundError) await setFlash("alert", MISSING);
      else throw error;
    }
  }
  redirect("/trash");
}

/** 1 件を完全に削除する（管理者のみ） */
export async function purgeTrashItemAction(id: number) {
  const guard = await guardAction("admin");
  if ("error" in guard) await setFlash("alert", guard.error);
  else {
    try {
      purgeTrashItem(id);
      revalidatePath("/trash");
      await setFlash("notice", "完全に削除しました。");
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error;
      await setFlash("alert", MISSING);
    }
  }
  redirect("/trash");
}

/** ゴミ箱を空にする（管理者のみ） */
export async function emptyTrashAction() {
  const guard = await guardAction("admin");
  if ("error" in guard) await setFlash("alert", guard.error);
  else {
    const count = emptyTrash();
    revalidatePath("/trash");
    await setFlash("notice", `ゴミ箱を空にしました（${count} 件を完全に削除）。`);
  }
  redirect("/trash");
}
