"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/access";
import { setFlash } from "@/lib/flash";
import { type FormState, str } from "@/lib/form";
import { keyOf } from "@/lib/text";
import { allowAttempt, clientIp, resetAttempts } from "@/lib/rate-limit";
import { endSession, getPendingMfaUser, promoteSession, startSession } from "@/lib/session";
import { authenticate, ensureDefaultAdmin, verifyMfaCode } from "@/lib/users";

const WINDOW = 3 * 60_000;
const withNext = (path: string, next: string | null) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

export async function loginAction(_prev: FormState, data: FormData): Promise<FormState> {
  ensureDefaultAdmin();
  const email = str(data, "email");
  const next = safeNext(str(data, "next"));

  // X-Forwarded-For は信頼できるプロキシの背後でないと偽装できるため、メールアドレス単位の制限も併用する
  const allowed = allowAttempt(`login:${await clientIp()}`, 10, WINDOW) && allowAttempt(`login-user:${keyOf(email)}`, 20, 10 * 60_000);
  if (!allowed) {
    return { errors: ["ログイン試行回数が多すぎます。しばらく待ってから再度お試しください。"], values: { email } };
  }
  const result = authenticate(email, str(data, "password"));
  if ("error" in result) {
    const message =
      result.error === "disabled"
        ? "このアカウントは無効になっています。管理者にお問い合わせください。"
        : "メールアドレスまたはパスワードが正しくありません。";
    return { errors: [message], values: { email } };
  }
  const { user } = result;

  if (user.mfaEnabled) {
    await startSession(user.id, { pendingMfa: true });
    redirect(withNext("/login/mfa", next));
  }
  await startSession(user.id);
  await setFlash("notice", "ログインしました。");
  redirect(next ?? "/");
}

export async function mfaChallengeAction(_prev: FormState, data: FormData): Promise<FormState> {
  const user = await getPendingMfaUser();
  if (!user) {
    await setFlash("alert", "もう一度ログインしてください。");
    redirect("/login");
  }
  const next = safeNext(str(data, "next"));
  const key = `mfa:${user.id}`;
  if (!allowAttempt(key, 10, WINDOW)) {
    return { errors: ["試行回数が多すぎます。しばらく待ってから再度お試しください。"] };
  }
  if (!verifyMfaCode(user.id, str(data, "code"))) return { errors: ["パスコードが正しくありません。"] };

  resetAttempts(key);
  await promoteSession(user.id);
  await setFlash("notice", "ログインしました。");
  redirect(next ?? "/");
}

export async function logoutAction() {
  await endSession();
  await setFlash("notice", "ログアウトしました。");
  redirect("/login");
}
