"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { saveUserAction } from "@/actions/users";
import { ROLES, type Role } from "@/lib/roles";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export function UserForm({
  userId,
  initial,
}: {
  userId: number | null;
  initial: { username: string; displayName: string; role: Role; mustChangePassword: boolean };
}) {
  const [state, action] = useActionState(saveUserAction, {});
  const v = state.values ?? { username: initial.username, displayName: initial.displayName, role: initial.role };
  return (
    <form action={action} className="form-card">
      <FormErrors errors={state.errors} />
      {userId !== null && <input type="hidden" name="id" value={userId} />}
      <div className="field-row">
        <div className="field">
          <label htmlFor="username">ユーザー名</label>
          <input type="text" id="username" name="username" defaultValue={v.username} required autoCapitalize="none" placeholder="例: yamada" />
        </div>
        <div className="field">
          <label htmlFor="displayName">表示名</label>
          <input type="text" id="displayName" name="displayName" defaultValue={v.displayName} placeholder="例: 山田 太郎" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="role">権限</label>
        <select id="role" name="role" defaultValue={v.role}>
          {(Object.entries(ROLES) as [Role, string][]).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="password">{userId === null ? "初期パスワード" : "新しいパスワード（変更する場合のみ）"}</label>
          <input type="password" id="password" name="password" autoComplete="new-password" minLength={8} required={userId === null} />
        </div>
        <div className="field">
          <label htmlFor="passwordConfirmation">パスワード（確認）</label>
          <input type="password" id="passwordConfirmation" name="passwordConfirmation" autoComplete="new-password" minLength={8} required={userId === null} />
        </div>
      </div>
      <label className="checkbox">
        <input type="checkbox" name="mustChangePassword" defaultChecked={state.values ? state.values.mustChangePassword === "on" : initial.mustChangePassword} />
        <span>次回ログイン時にパスワード変更を求める</span>
      </label>
      <div className="form-actions">
        <SubmitButton className="button button-primary" pendingText="保存中...">
          <Save size={18} aria-hidden />
          <span>保存</span>
        </SubmitButton>
        <Link href="/users" className="button">
          キャンセル
        </Link>
      </div>
    </form>
  );
}
