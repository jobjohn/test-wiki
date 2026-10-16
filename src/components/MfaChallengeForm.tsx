"use client";

import { ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import { mfaChallengeAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export function MfaChallengeForm({ next }: { next: string }) {
  const [state, action] = useActionState(mfaChallengeAction, {});
  return (
    <form action={action}>
      <FieldGroup>
        <FormErrors errors={state.errors} />
        <input type="hidden" name="next" value={next} />
        <Field>
          <FieldLabel htmlFor="code">パスコード</FieldLabel>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={16}
            required
            autoFocus
            placeholder="123456"
            className="h-11 text-center font-mono text-xl tracking-[0.2em]"
          />
          <FieldDescription>スマートフォンを利用できない場合は、バックアップコード（xxxxx-xxxxx）を入力できます。</FieldDescription>
        </Field>
        <SubmitButton className="w-full" pendingText="確認中...">
          <ShieldCheck aria-hidden />
          確認
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
