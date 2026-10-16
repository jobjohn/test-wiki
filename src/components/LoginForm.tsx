"use client";

import { Lock, LogIn, User } from "lucide-react";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, {});
  return (
    <form action={action}>
      <FieldGroup>
        <FormErrors errors={state.errors} />
        <input type="hidden" name="next" value={next} />
        <Field>
          <FieldLabel htmlFor="username">ユーザー名</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="username"
              name="username"
              defaultValue={state.values?.username}
              autoComplete="username"
              autoCapitalize="none"
              required
              autoFocus
            />
            <InputGroupAddon>
              <User aria-hidden />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="password">パスワード</FieldLabel>
          <InputGroup>
            <InputGroupInput type="password" id="password" name="password" autoComplete="current-password" required />
            <InputGroupAddon>
              <Lock aria-hidden />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <SubmitButton className="w-full" pendingText="確認中...">
          <LogIn aria-hidden />
          ログイン
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
