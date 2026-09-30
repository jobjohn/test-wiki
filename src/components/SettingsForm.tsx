"use client";

import { BookOpen, Palette, Save, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { saveSettingsAction } from "@/actions/settings";
import { FormErrors } from "./FormErrors";
import type { SettingsFormValues } from "./SetupForm";
import { SubmitButton } from "./SubmitButton";
import { ThemePicker } from "./ThemePicker";

export function SettingsForm({ initial, publicRead, requireMfa }: { initial: SettingsFormValues; publicRead: boolean; requireMfa: boolean }) {
  const [state, action] = useActionState(saveSettingsAction, {});
  const [isPublic, setIsPublic] = useState(publicRead);
  const [mfaRequired, setMfaRequired] = useState(requireMfa);
  const v = state.values;
  return (
    <form action={action} className="form-card">
      <FormErrors errors={state.errors} />

      <h2 className="form-section">
        <BookOpen size={18} aria-hidden /> 基本情報
      </h2>
      <div className="field">
        <label htmlFor="wikiName">Wiki の名前</label>
        <input type="text" id="wikiName" name="wikiName" defaultValue={v?.wikiName ?? initial.wikiName} required maxLength={50} />
      </div>
      <div className="field">
        <label htmlFor="description">Wiki の説明</label>
        <textarea id="description" name="description" rows={3} defaultValue={v?.description ?? initial.description} />
        <p className="hint">ホーム画面の上部に表示されます（Markdown 可）。</p>
      </div>

      <h2 className="form-section">
        <Palette size={18} aria-hidden /> 見た目
      </h2>
      <ThemePicker initialTheme={initial.theme} initialColors={initial.colors} initialMode={initial.colorMode} showMode />

      <h2 className="form-section">
        <ShieldCheck size={18} aria-hidden /> アクセスとセキュリティ
      </h2>
      <label className="checkbox">
        <input type="checkbox" name="publicRead" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        <span>
          <strong>ログインなしで閲覧を許可</strong>
          <br />
          <span className="hint">オンにすると、ログインしていない人もページを閲覧できます（編集にはログインが必要）。</span>
        </span>
      </label>
      <label className="checkbox">
        <input type="checkbox" name="requireMfa" checked={mfaRequired} onChange={(e) => setMfaRequired(e.target.checked)} />
        <span>
          <strong>全ユーザーに二段階認証を必須にする</strong>
          <br />
          <span className="hint">オンにすると、二段階認証を設定していないユーザーはログイン後に設定画面へ案内されます。</span>
        </span>
      </label>

      <div className="form-actions">
        <SubmitButton className="button button-primary" pendingText="保存中...">
          <Save size={18} aria-hidden />
          <span>設定を保存</span>
        </SubmitButton>
      </div>
    </form>
  );
}
