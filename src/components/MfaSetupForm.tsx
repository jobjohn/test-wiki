"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { enableMfaAction } from "@/actions/account";
import { BackupCodes } from "./BackupCodes";
import { CopyText } from "./CopyText";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export function MfaSetupForm({ secret, qrSvg }: { secret: string; qrSvg: string }) {
  const [state, action] = useActionState(enableMfaAction, {});
  if (state.backupCodes) return <BackupCodes codes={state.backupCodes} />;

  return (
    <div className="form-card mfa-setup">
      <FormErrors errors={state.errors} />
      <ol className="steps">
        <li>
          <strong>認証アプリで QR コードを読み取ります</strong>
          <p className="hint">Google Authenticator、Microsoft Authenticator、1Password などが使えます。</p>
          <div className="qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <details>
            <summary>QR コードを読み取れない場合</summary>
            <p className="hint">アプリに次のキーを手入力してください。</p>
            <CopyText text={secret} display={secret.replace(/(.{4})/g, "$1 ").trim()} className="secret" />
          </details>
        </li>
        <li>
          <strong>アプリに表示された 6 桁のパスコードを入力します</strong>
          <form action={action} className="input-with-button">
            <input
              type="text"
              name="code"
              className="code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={7}
              required
              autoFocus
              placeholder="123456"
              aria-label="パスコード"
            />
            <SubmitButton className="button button-primary" pendingText="確認中...">
              <Check size={18} aria-hidden />
              <span>有効にする</span>
            </SubmitButton>
          </form>
        </li>
      </ol>
    </div>
  );
}
