"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guardAction } from "@/lib/access";
import { ValidationError } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { bool, type FormState, optionalId, str, values } from "@/lib/form";
import { createUser, deleteUser, disableMfa, getUser, updateUser, type Role } from "@/lib/users";

const FIELDS = ["username", "displayName", "role", "mustChangePassword"];

export async function saveUserAction(_prev: FormState, data: FormData): Promise<FormState> {
  const guard = await guardAction("admin");
  if ("error" in guard) return { errors: [guard.error] };

  const id = optionalId(data, "id");
  const input = {
    username: str(data, "username"),
    displayName: str(data, "displayName"),
    role: str(data, "role") as Role,
    password: str(data, "password"),
    passwordConfirmation: str(data, "passwordConfirmation"),
    mustChangePassword: bool(data, "mustChangePassword"),
  };
  try {
    if (id === null) createUser(input);
    else updateUser(id, input);
  } catch (error) {
    if (error instanceof ValidationError) return { errors: error.messages, values: values(data, FIELDS) };
    throw error;
  }
  revalidatePath("/", "layout");
  await setFlash("notice", `ユーザー「${input.username.trim()}」を${id === null ? "作成" : "更新"}しました。`);
  redirect("/users");
}

export async function deleteUserAction(id: number) {
  const guard = await guardAction("admin");
  if ("error" in guard) {
    await setFlash("alert", guard.error);
    redirect("/users");
  }
  const target = getUser(id);
  try {
    if (!target) throw new ValidationError("ユーザーが見つかりません。");
    if (target.id === guard.user.id) throw new ValidationError("自分自身は削除できません。");
    deleteUser(id);
    await setFlash("notice", `ユーザー「${target.username}」を削除しました。`);
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    await setFlash("alert", error.messages.join("、"));
  }
  redirect("/users");
}

export async function resetUserMfaAction(id: number) {
  const guard = await guardAction("admin");
  if ("error" in guard) {
    await setFlash("alert", guard.error);
    redirect("/users");
  }
  disableMfa(id);
  await setFlash("notice", "二段階認証をリセットしました。");
  redirect(`/users/${id}/edit`);
}

