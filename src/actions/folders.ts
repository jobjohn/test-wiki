"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guardAction } from "@/lib/access";
import { ValidationError } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { type FormState, int, optionalId, str, values } from "@/lib/form";
import { createFolder, dissolveFolder, getFolder, updateFolder } from "@/lib/folders";

export async function saveFolderAction(_prev: FormState, data: FormData): Promise<FormState> {
  const guard = await guardAction("editor");
  if ("error" in guard) return { errors: [guard.error] };

  const id = optionalId(data, "id");
  const input = { name: str(data, "name"), parentId: optionalId(data, "parentId"), position: int(data, "position") };
  try {
    let savedId: number;
    if (id === null) savedId = createFolder(input);
    else {
      updateFolder(id, input);
      savedId = id;
    }
    revalidatePath("/", "layout");
    await setFlash("notice", id === null ? `フォルダ「${input.name.trim()}」を作成しました。` : "フォルダを更新しました。");
    redirect(`/folders/${savedId}`);
  } catch (error) {
    if (error instanceof ValidationError) return { errors: error.messages, values: values(data, ["name", "parentId", "position"]) };
    throw error;
  }
}

/** フォルダを削除し、中身は 1 つ上の階層へ移す */
export async function deleteFolderAction(id: number) {
  const guard = await guardAction("editor");
  const folder = getFolder(id);
  if ("error" in guard || !folder) {
    await setFlash("alert", "error" in guard ? guard.error : "フォルダが見つかりません。");
    redirect("/");
  }
  try {
    dissolveFolder(id);
    revalidatePath("/", "layout");
    const parent = folder.parentId ? getFolder(folder.parentId) : undefined;
    await setFlash("notice", `フォルダ「${folder.name}」を削除しました（中身は${parent ? `「${parent.name}」` : "トップ"}へ移動）。`);
    redirect(parent ? `/folders/${parent.id}` : "/");
  } catch (error) {
    if (error instanceof ValidationError) {
      await setFlash("alert", `削除できませんでした: ${error.messages.join("、")}`);
      redirect(`/folders/${id}`);
    }
    throw error;
  }
}
