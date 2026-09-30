"use client";

import { RotateCcw, Save, X } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { changePasswordAction, disableMfaAction, regenerateBackupCodesAction, updateProfileAction } from "@/actions/account";
import { BackupCodes } from "./BackupCodes";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action] = useActionState(updateProfileAction, {});
  return (
    <form action={action} className="inline-form">
      <FormErrors errors={state.errors} />
      <div className="field">
        <label htmlFor="displayName">表示名</label>
        <div className="input-with-button">
          <input type="text" id="displayName" name="displayName" defaultValue={state.values?.displayName ?? displayName} maxLength={50} />
          <SubmitButton className="button" pendingText="保存中...">
            <Save size={16} aria-hidden />
            <span>保存</span>
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

export function PasswordForm({ cancelable }: { cancelable: boolean }) {
  const [state, action] = useActionState(changePasswordAction, {});
  return (
    <form action={action} className="form-card form-narrow">
      <FormErrors errors={state.errors} />
      <div className="field">
        <label htmlFor="currentPassword">現在のパスワード</label>
        <input type="password" id="currentPassword" name="currentPassword" autoComplete="current-password" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="password">新しいパスワード（8 文字以上）</label>
        <input type="password" id="password" name="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="field">
        <label htmlFor="passwordConfirmation">新しいパスワード（確認）</label>
        <input type="password" id="passwordConfirmation" name="passwordConfirmation" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="form-actions">
        <SubmitButton className="button button-primary" pendingText="変更中...">
          <Save size={18} aria-hidden />
          <span>変更する</span>
        </SubmitButton>
        {cancelable && (
          <Link href="/account" className="button">
            キャンセル
          </Link>
        )}
      </div>
    </form>
  );
}

/** 二段階認証が有効なときの操作（バックアップコードの再発行・無効化） */
export function MfaManage({ requireMfa }: { requireMfa: boolean }) {
  const [regen, regenAction] = useActionState(regenerateBackupCodesAction, {});
  const [disable, disableAction] = useActionState(disableMfaAction, {});
  if (regen.backupCodes) return <BackupCodes codes={regen.backupCodes} title="新しいバックアップコード" />;

  return (
    <div className="mfa-actions">
      <FormErrors errors={[...(regen.errors ?? []), ...(disable.errors ?? [])]} />
      <form action={regenAction} className="input-with-button">
        <input type="password" name="password" placeholder="パスワード" autoComplete="current-password" required aria-label="パスワード" />
        <SubmitButton className="button" pendingText="処理中...">
          <RotateCcw size={16} aria-hidden />
          <span>バックアップコードを再発行</span>
        </SubmitButton>
      </form>
      {!requireMfa && (
        <form
          action={disableAction}
          className="input-with-button"
          onSubmit={(e) => {
            if (!window.confirm("二段階認証を無効にしますか？")) e.preventDefault();
          }}
        >
          <input type="password" name="password" placeholder="パスワード" autoComplete="current-password" required aria-label="パスワード" />
          <SubmitButton className="button button-danger" pendingText="処理中...">
            <X size={16} aria-hidden />
            <span>無効にする</span>
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

