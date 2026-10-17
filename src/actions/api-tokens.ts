"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guardAction } from "@/lib/access";
import { createApiToken, revokeApiToken } from "@/lib/api-tokens";
import { ValidationError } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { type FormState, str } from "@/lib/form";

/** アクセストークンを発行する。平文はこの戻り値で 1 回だけ返す */
export async function createApiTokenAction(_prev: FormState, data: FormData): Promise<FormState> {
  const guard = await guardAction("read");
  if ("error" in guard) return { errors: [guard.error] };
  try {
    const { token, summary } = createApiToken(guard.user.id, {
      name: str(data, "name"),
      expiry: str(data, "expiry") || undefined,
      scope: str(data, "scope") || undefined,
    });
    revalidatePath("/account");
    return { token: { name: summary.name, value: token } };
  } catch (error) {
    if (error instanceof ValidationError) return { errors: error.messages, values: { name: str(data, "name"), expiry: str(data, "expiry"), scope: str(data, "scope") } };
    throw error;
  }
}

/** 自分のトークンを取り消す */
export async function revokeApiTokenAction(tokenId: number): Promise<void> {
  // 取り消しは、MFA 未設定などの必須手続きが残っていてもできるようにする（発行は止める）
  const guard = await guardAction("read", { gate: false });
  if ("error" in guard) {
    await setFlash("alert", guard.error);
    redirect("/account");
  }
  const ok = Number.isInteger(tokenId) && revokeApiToken(guard.user.id, tokenId);
  await setFlash("notice", ok ? "アクセストークンを取り消しました。" : "トークンが見つかりません。");
  redirect("/account");
}
