"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guardAction } from "@/lib/access";
import { setFlash } from "@/lib/flash";
import { deleteUpload } from "@/lib/uploads";

export async function deleteUploadAction(id: number) {
  const guard = await guardAction("edit");
  if ("error" in guard) await setFlash("alert", guard.error);
  else {
    deleteUpload(id);
    revalidatePath("/uploads");
    await setFlash("notice", "ファイルを削除しました。");
  }
  redirect("/uploads");
}
