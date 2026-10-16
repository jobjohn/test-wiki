"use client";

import { BookOpen, Palette, Save, ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import { saveSettingsAction } from "@/actions/settings";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm } from "./ActionForm";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { FormErrors } from "./FormErrors";
import type { SettingsFormValues } from "./SetupForm";
import { SubmitButton } from "./SubmitButton";
import { ThemePicker } from "./ThemePicker";

function Section({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <FieldSet>
      <FieldLegend className="flex items-center gap-2">
        <Icon className="size-[18px] text-primary" aria-hidden />
        {title}
      </FieldLegend>
      <FieldGroup>{children}</FieldGroup>
    </FieldSet>
  );
}

function SwitchRow({
  id,
  name,
  label,
  description,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <FieldLabel htmlFor={id}>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>{label}</FieldTitle>
          <FieldDescription>{description}</FieldDescription>
        </FieldContent>
        <Switch id={id} name={name} defaultChecked={defaultChecked} />
      </Field>
    </FieldLabel>
  );
}

export function SettingsForm({ initial, publicRead, requireMfa }: { initial: SettingsFormValues; publicRead: boolean; requireMfa: boolean }) {
  const [state, action] = useActionState(saveSettingsAction, {});
  const v = state.values;
  return (
    <Card>
      <CardContent>
        <ActionForm action={action}>
          <FieldGroup>
            <FormErrors errors={state.errors} />

            <Section icon={BookOpen} title="基本情報">
              <Field>
                <FieldLabel htmlFor="wikiName">Wiki の名前</FieldLabel>
                <Input id="wikiName" name="wikiName" defaultValue={v?.wikiName ?? initial.wikiName} required maxLength={50} />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Wiki の説明</FieldLabel>
                <Textarea id="description" name="description" rows={3} defaultValue={v?.description ?? initial.description} />
                <FieldDescription>ホーム画面の上部に表示されます（Markdown 可）。</FieldDescription>
              </Field>
            </Section>

            <FieldSeparator />
            <Section icon={Palette} title="見た目">
              <ThemePicker initialTheme={initial.theme} initialColors={initial.colors} initialMode={initial.colorMode} showMode />
            </Section>

            <FieldSeparator />
            <Section icon={ShieldCheck} title="アクセスとセキュリティ">
              <SwitchRow
                id="publicRead"
                name="publicRead"
                label="ログインなしで閲覧を許可"
                description="オンにすると、ログインしていない人もページを閲覧できます（編集にはログインが必要）。"
                defaultChecked={publicRead}
              />
              <SwitchRow
                id="requireMfa"
                name="requireMfa"
                label="全ユーザーに二段階認証を必須にする"
                description="オンにすると、二段階認証を設定していないユーザーはログイン後に設定画面へ案内されます。"
                defaultChecked={requireMfa}
              />
            </Section>

            <div>
              <SubmitButton pendingText="保存中...">
                <Save aria-hidden />
                設定を保存
              </SubmitButton>
            </div>
          </FieldGroup>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
