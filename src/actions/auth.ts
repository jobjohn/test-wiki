"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/access";
import { setFlash } from "@/lib/flash";
import { type FormState, str } from "@/lib/form";
import { logEvent } from "@/lib/log";
import { allowAttempt, allowLoginAttempt, clientIp, resetAttempts } from "@/lib/rate-limit";
import { emailHash } from "@/lib/secret";
import { endSession, getPendingMfaUser, promoteSession, startSession } from "@/lib/session";
import { authenticate, ensureDefaultAdmin, verifyMfaCode } from "@/lib/users";

const WINDOW = 3 * 60_000;
const withNext = (path: string, next: string | null) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

export async function loginAction(_prev: FormState, data: FormData): Promise<FormState> {
  ensureDefaultAdmin();
  const email = str(data, "email");
  const next = safeNext(str(data, "next"));

  // X-Forwarded-For は TRUST_PROXY=true のときだけ信頼する（rate-limit.ts 参照）
  if (!allowLoginAttempt(await clientIp(), email)) {
    logEvent("warn", "auth.login_failed", { reason: "rate_limited", emailHash: emailHash(email) });
    return { errors: ["ログイン試行回数が多すぎます。しばらく待ってから再度お試しください。"], values: { email } };
  }
  const result = authenticate(email, str(data, "password"));
  if ("error" in result) {
    // パスワード・メールアドレス・IP は書かない
    logEvent("warn", "auth.login_failed", { reason: result.error, emailHash: emailHash(email) });
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
  logEvent("info", "auth.login", { userId: user.id, mfa: false });
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
    logEvent("warn", "auth.mfa_failed", { reason: "rate_limited", userId: user.id });
    return { errors: ["試行回数が多すぎます。しばらく待ってから再度お試しください。"] };
  }
  if (!verifyMfaCode(user.id, str(data, "code"))) {
    logEvent("warn", "auth.mfa_failed", { reason: "invalid_code", userId: user.id });
    return { errors: ["パスコードが正しくありません。"] };
  }

  resetAttempts(key);
  await promoteSession(user.id);
  logEvent("info", "auth.login", { userId: user.id, mfa: true });
  await setFlash("notice", "ログインしました。");
  redirect(next ?? "/");
}

export async function logoutAction() {
  await endSession();
  await setFlash("notice", "ログアウトしました。");
  redirect("/login");
}
