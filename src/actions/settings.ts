"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guardAction } from "@/lib/access";
import { transaction } from "@/lib/db";
import { defaultAdminPassword } from "@/lib/env";
import { ValidationError } from "@/lib/errors";
import { setFlash } from "@/lib/flash";
import { bool, type FormState, str } from "@/lib/form";
import { currentSessionId } from "@/lib/session";
import { updateSettings, type SettingsInput } from "@/lib/settings";
import { changePassword, validatePassword } from "@/lib/users";

const FIELDS = ["wikiName", "description", "theme", "primaryColor", "secondaryColor", "accentColor", "colorMode"];

function settingsInput(data: FormData): SettingsInput {
  return {
    wikiName: str(data, "wikiName"),
    description: str(data, "description"),
    theme: str(data, "theme"),
    primaryColor: str(data, "primaryColor"),
    secondaryColor: str(data, "secondaryColor"),
    accentColor: str(data, "accentColor"),
    colorMode: str(data, "colorMode") || undefined,
  };
}

const collect = (data: FormData) => Object.fromEntries(FIELDS.map((k) => [k, str(data, k)]));

export async function saveSettingsAction(_prev: FormState, data: FormData): Promise<FormState> {
  const guard = await guardAction("admin");
  if ("error" in guard) return { errors: [guard.error] };
  try {
    updateSettings({ ...settingsInput(data), publicRead: bool(data, "publicRead"), requireMfa: bool(data, "requireMfa") });
  } catch (error) {
    if (error instanceof ValidationError) return { errors: error.messages, values: collect(data) };
    throw error;
  }
  revalidatePath("/", "layout");
  await setFlash("notice", "設定を保存しました。");
  redirect("/settings");
}

/** 初回ログイン時の初期設定（Wiki の名前・説明・テーマ・管理者パスワード） */
export async function completeSetupAction(_prev: FormState, data: FormData): Promise<FormState> {
  const guard = await guardAction("admin", { gate: false });
  if ("error" in guard) return { errors: [guard.error] };
  const { user } = guard;

  const errors: string[] = [];
  const password = str(data, "password");
  if (user.mustChangePassword) {
    errors.push(...validatePassword(password, str(data, "passwordConfirmation")));
    if (password === defaultAdminPassword()) errors.push("パスワードは初期パスワードと異なるものにしてください");
  }

  try {
    if (errors.length) throw new ValidationError(errors);
    const sessionId = await currentSessionId();
    transaction(() => {
      updateSettings(settingsInput(data), { completeSetup: true });
      if (user.mustChangePassword) changePassword(user.id, password, sessionId);
    });
  } catch (error) {
    if (error instanceof ValidationError) return { errors: error.messages, values: collect(data) };
    throw error;
  }
  revalidatePath("/", "layout");
  await setFlash("notice", "初期設定が完了しました。ようこそ！");
  redirect("/");
}
