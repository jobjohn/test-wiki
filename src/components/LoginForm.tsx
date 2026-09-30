"use client";

import { Lock, LogIn, User } from "lucide-react";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Field } from "./Field";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, {});
  return (
    <form action={action} className="grid gap-4">
      <FormErrors errors={state.errors} />
      <input type="hidden" name="next" value={next} />
      <Field label="ユーザー名" htmlFor="username">
        <div className="relative">
          <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="username" name="username" defaultValue={state.values?.username} autoComplete="username" autoCapitalize="none" required autoFocus className="pl-9" />
        </div>
      </Field>
      <Field label="パスワード" htmlFor="password">
        <div className="relative">
          <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="password" id="password" name="password" autoComplete="current-password" required className="pl-9" />
        </div>
      </Field>
      <SubmitButton className="w-full" pendingText="確認中...">
        <LogIn aria-hidden />
        ログイン
      </SubmitButton>
    </form>
  );
}
