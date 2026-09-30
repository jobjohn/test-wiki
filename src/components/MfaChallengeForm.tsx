"use client";

import { ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import { mfaChallengeAction } from "@/actions/auth";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export function MfaChallengeForm({ next }: { next: string }) {
  const [state, action] = useActionState(mfaChallengeAction, {});
  return (
    <form action={action} className="auth-form">
      <FormErrors errors={state.errors} />
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="code">パスコード</label>
        <input
          type="text"
          name="code"
          id="code"
          className="code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={16}
          required
          autoFocus
          placeholder="123456"
        />
        <p className="hint">スマートフォンを利用できない場合は、バックアップコード（xxxxx-xxxxx）を入力できます。</p>
      </div>
      <SubmitButton className="button button-primary button-block" pendingText="確認中...">
        <ShieldCheck size={18} aria-hidden />
        <span>確認</span>
      </SubmitButton>
    </form>
  );
}
