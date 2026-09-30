"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { completeSetupAction } from "@/actions/settings";
import type { ColorMode, ThemeKey } from "@/lib/themes";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";
import { ThemePicker } from "./ThemePicker";

export interface SettingsFormValues {
  wikiName: string;
  description: string;
  theme: ThemeKey | "custom";
  colors: { primary: string; secondary: string; accent: string };
  colorMode: ColorMode;
}

export function SetupForm({ initial, mustChangePassword }: { initial: SettingsFormValues; mustChangePassword: boolean }) {
  const [state, action] = useActionState(completeSetupAction, {});
  const v = state.values;
  return (
    <form action={action} className="form-card">
      <FormErrors errors={state.errors} />

      <h2 className="form-section">
        <span className="step">1</span>どんな Wiki ですか？
      </h2>
      <div className="field">
        <label htmlFor="wikiName">Wiki の名前</label>
        <input type="text" id="wikiName" name="wikiName" defaultValue={v?.wikiName ?? initial.wikiName} required maxLength={50} placeholder="例: 開発チーム Wiki" />
      </div>
      <div className="field">
        <label htmlFor="description">Wiki の説明</label>
        <textarea id="description" name="description" rows={3} defaultValue={v?.description ?? initial.description} placeholder="例: 開発チームの手順書・設計資料・ノウハウをまとめる Wiki です。" />
        <p className="hint">ホーム画面の上部に表示されます（Markdown 可）。</p>
      </div>

      <h2 className="form-section">
        <span className="step">2</span>カラーテーマ
      </h2>
      <ThemePicker initialTheme={initial.theme} initialColors={initial.colors} initialMode={initial.colorMode} legend={false} />

      {mustChangePassword && (
        <>
          <h2 className="form-section">
            <span className="step">3</span>管理者パスワードの変更
          </h2>
          <p className="hint">初期ユーザーのパスワードを変更してください（8 文字以上）。</p>
          <div className="field-row">
            <div className="field">
              <label htmlFor="password">新しいパスワード</label>
              <input type="password" id="password" name="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="field">
              <label htmlFor="passwordConfirmation">新しいパスワード（確認）</label>
              <input type="password" id="passwordConfirmation" name="passwordConfirmation" autoComplete="new-password" minLength={8} required />
            </div>
          </div>
        </>
      )}

      <div className="form-actions">
        <SubmitButton className="button button-primary" pendingText="保存中...">
          <Check size={18} aria-hidden />
          <span>設定を完了して始める</span>
        </SubmitButton>
      </div>
    </form>
  );
}
