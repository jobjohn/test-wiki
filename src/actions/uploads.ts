"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guardAction } from "@/lib/access";
import { NotFoundError } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { safePurge, TRASH_RETENTION_DAYS, trashUpload } from "@/lib/trash";
import { getUpload } from "@/lib/uploads";

export async function deleteUploadAction(id: number) {
  const guard = await guardAction("edit");
  if ("error" in guard) await setFlash("alert", guard.error);
  else {
    const upload = getUpload(id);
    try {
      // 実ファイルは残したまま、ゴミ箱へ退避する（期限内なら元に戻せる）
      trashUpload(id, guard.user.id);
      safePurge();
      revalidatePath("/uploads");
      await setFlash("notice", `ファイル「${upload?.filename ?? ""}」をゴミ箱に移動しました（${TRASH_RETENTION_DAYS} 日後に完全に削除されます）。`);
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error;
      await setFlash("alert", "ファイルが見つかりません（既に削除された可能性があります）。");
    }
  }
  redirect("/uploads");
}
