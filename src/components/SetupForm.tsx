"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { completeSetupAction } from "@/actions/settings";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { ColorMode, ThemeKey } from "@/lib/themes";
import { ActionForm } from "./ActionForm";
import { Field } from "./Field";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";
import { ThemePicker } from "./ThemePicker";

export interface SettingsFormValues {
  wikiName: string;
  description: string;
  theme: ThemeKey | "custom";
  colors: { primaryColor: string; secondaryColor: string; accentColor: string };
  colorMode: ColorMode;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-semibold">
      <span className="flex size-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{n}</span>
      {children}
    </h2>
  );
}

export function SetupForm({ initial, mustChangePassword }: { initial: SettingsFormValues; mustChangePassword: boolean }) {
  const [state, action] = useActionState(completeSetupAction, {});
  const v = state.values;
  return (
    <Card>
      <CardContent>
        <ActionForm action={action} className="grid gap-6">
          <FormErrors errors={state.errors} />

          <section className="grid gap-4">
            <Step n={1}>どんな Wiki ですか？</Step>
            <Field label="Wiki の名前" htmlFor="wikiName">
              <Input id="wikiName" name="wikiName" defaultValue={v?.wikiName ?? initial.wikiName} required maxLength={50} placeholder="例: 開発チーム Wiki" />
            </Field>
            <Field label="Wiki の説明" htmlFor="description" hint="ホーム画面の上部に表示されます（Markdown 可）。">
              <Textarea id="description" name="description" rows={3} defaultValue={v?.description ?? initial.description} placeholder="例: 開発チームの手順書・設計資料・ノウハウをまとめる Wiki です。" />
            </Field>
          </section>

          <Separator />
          <section className="grid gap-4">
            <Step n={2}>カラーテーマ</Step>
            <ThemePicker initialTheme={initial.theme} initialColors={initial.colors} initialMode={initial.colorMode} />
          </section>

          {mustChangePassword && (
            <>
              <Separator />
              <section className="grid gap-4">
                <Step n={3}>管理者パスワードの変更</Step>
                <p className="text-sm text-muted-foreground">初期ユーザーのパスワードを変更してください（8 文字以上）。</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="新しいパスワード" htmlFor="password">
                    <Input type="password" id="password" name="password" autoComplete="new-password" minLength={8} required />
                  </Field>
                  <Field label="新しいパスワード（確認）" htmlFor="passwordConfirmation">
                    <Input type="password" id="passwordConfirmation" name="passwordConfirmation" autoComplete="new-password" minLength={8} required />
                  </Field>
                </div>
              </section>
            </>
          )}

          <div>
            <SubmitButton pendingText="保存中...">
              <Check aria-hidden />
              設定を完了して始める
            </SubmitButton>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
