"use client";

import { LogIn, Lock, User } from "lucide-react";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, {});
  return (
    <form action={action} className="auth-form">
      <FormErrors errors={state.errors} />
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="username">ユーザー名</label>
        <div className="input-icon">
          <User size={16} aria-hidden />
          <input type="text" name="username" id="username" defaultValue={state.values?.username} autoComplete="username" autoCapitalize="none" required autoFocus />
        </div>
      </div>
      <div className="field">
        <label htmlFor="password">パスワード</label>
        <div className="input-icon">
          <Lock size={16} aria-hidden />
          <input type="password" name="password" id="password" autoComplete="current-password" required />
        </div>
      </div>
      <SubmitButton className="button button-primary button-block" pendingText="確認中...">
        <LogIn size={18} aria-hidden />
        <span>ログイン</span>
      </SubmitButton>
    </form>
  );
}
