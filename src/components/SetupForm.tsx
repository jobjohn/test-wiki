"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { completeSetupAction } from "@/actions/settings";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm } from "./ActionForm";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export interface SettingsFormValues {
  wikiName: string;
  description: string;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <FieldLegend className="flex items-center gap-2.5">
      <Badge>{n}</Badge>
      {children}
    </FieldLegend>
  );
}

export function SetupForm({ initial, mustChangePassword }: { initial: SettingsFormValues; mustChangePassword: boolean }) {
  const [state, action] = useActionState(completeSetupAction, {});
  const v = state.values;
  return (
    <Card>
      <CardContent>
        <ActionForm action={action}>
          <FieldGroup>
            <FormErrors errors={state.errors} />

            <FieldSet>
              <Step n={1}>どんな Wiki ですか？</Step>
              <Field>
                <FieldLabel htmlFor="wikiName">Wiki の名前</FieldLabel>
                <Input
                  id="wikiName"
                  name="wikiName"
                  defaultValue={v?.wikiName ?? initial.wikiName}
                  required
                  maxLength={50}
                  placeholder="例: 開発チーム Wiki"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Wiki の説明</FieldLabel>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={v?.description ?? initial.description}
                  placeholder="例: 開発チームの手順書・設計資料・ノウハウをまとめる Wiki です。"
                />
                <FieldDescription>ホーム画面の上部に表示されます（Markdown 可）。</FieldDescription>
              </Field>
            </FieldSet>

            {mustChangePassword && (
              <>
                <FieldSeparator />
                <FieldSet>
                  <Step n={2}>管理者パスワードの変更</Step>
                  <FieldDescription>初期ユーザーのパスワードを変更してください（8 文字以上）。</FieldDescription>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="password">新しいパスワード</FieldLabel>
                      <Input type="password" id="password" name="password" autoComplete="new-password" minLength={8} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="passwordConfirmation">新しいパスワード（確認）</FieldLabel>
                      <Input
                        type="password"
                        id="passwordConfirmation"
                        name="passwordConfirmation"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                    </Field>
                  </div>
                </FieldSet>
              </>
            )}

            <div>
              <SubmitButton pendingText="保存中...">
                <Check aria-hidden />
                設定を完了して始める
              </SubmitButton>
            </div>
          </FieldGroup>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
