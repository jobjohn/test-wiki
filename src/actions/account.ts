"use server";

import { redirect } from "next/navigation";
import { guardAction } from "@/lib/access";
import { ValidationError } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { type FormState, str } from "@/lib/form";
import { allowAttempt } from "@/lib/rate-limit";
import { currentSessionId } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import {
  changePassword,
  checkPassword,
  confirmMfa,
  disableMfa,
  regenerateBackupCodes,
  updateDisplayName,
  validatePassword,
} from "@/lib/users";

export async function updateProfileAction(_prev: FormState, data: FormData): Promise<FormState> {
  const guard = await guardAction("viewer");
  if ("error" in guard) return { errors: [guard.error] };
  try {
    updateDisplayName(guard.user.id, str(data, "displayName"));
  } catch (error) {
    if (error instanceof ValidationError) return { errors: error.messages, values: { displayName: str(data, "displayName") } };
    throw error;
  }
  await setFlash("notice", "プロフィールを更新しました。");
  redirect("/account");
}

export async function changePasswordAction(_prev: FormState, data: FormData): Promise<FormState> {
  // 初回ログイン時のパスワード変更画面でも使うため、必須手続きの確認は行わない
  const guard = await guardAction("viewer", { gate: false });
  if ("error" in guard) return { errors: [guard.error] };
  const { user } = guard;

  if (!allowAttempt(`password:${user.id}`, 10, 3 * 60_000)) {
    return { errors: ["試行回数が多すぎます。しばらく待ってから再度お試しください。"] };
  }
  const current = str(data, "currentPassword");
  const password = str(data, "password");
  const errors: string[] = [];
  if (!checkPassword(user.id, current)) errors.push("現在のパスワードが正しくありません。");
  else {
    if (password === current) errors.push("新しいパスワードは現在のパスワードと異なるものにしてください。");
    errors.push(...validatePassword(password, str(data, "passwordConfirmation")));
  }
  if (errors.length) return { errors };

  changePassword(user.id, password, await currentSessionId());
  await setFlash("notice", "パスワードを変更しました。他の端末のログインは解除されました。");
  redirect("/account");
}

/** 認証アプリに表示されたパスコードを確認して二段階認証を有効にする */
export async function enableMfaAction(_prev: FormState, data: FormData): Promise<FormState> {
  const guard = await guardAction("viewer", { gate: false });
  if ("error" in guard) return { errors: [guard.error] };
  if (!allowAttempt(`mfa-setup:${guard.user.id}`, 10, 3 * 60_000)) return { errors: ["試行回数が多すぎます。しばらく待ってから再度お試しください。"] };

  const codes = confirmMfa(guard.user.id, str(data, "code"));
  if (!codes) return { errors: ["パスコードが正しくありません。認証アプリに表示されている 6 桁の数字を入力してください。"] };
  return { backupCodes: codes };
}

export async function regenerateBackupCodesAction(_prev: FormState, data: FormData): Promise<FormState> {
  const guard = await guardAction("viewer");
  if ("error" in guard) return { errors: [guard.error] };
  if (!guard.user.mfaEnabled || !checkPassword(guard.user.id, str(data, "password"))) return { errors: ["パスワードが正しくありません。"] };
  return { backupCodes: regenerateBackupCodes(guard.user.id) };
}

export async function disableMfaAction(_prev: FormState, data: FormData): Promise<FormState> {
  const guard = await guardAction("viewer");
  if ("error" in guard) return { errors: [guard.error] };
  if (getSettings().requireMfa) return { errors: ["この Wiki では二段階認証が必須のため無効にできません。"] };
  if (!checkPassword(guard.user.id, str(data, "password"))) return { errors: ["パスワードが正しくありません。"] };
  disableMfa(guard.user.id);
  await setFlash("notice", "二段階認証を無効にしました。");
  redirect("/account");
}
