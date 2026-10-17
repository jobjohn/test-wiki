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
import type { ColorMode } from "@/lib/color-mode";
import { SubmitButton } from "./SubmitButton";
import { ColorModePicker } from "./ColorModePicker";

function Section({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <FieldSet>
      <FieldLegend className="flex items-center gap-2">
        <Icon className="size-4" aria-hidden />
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

export function SettingsForm({
  initial,
  publicRead,
  requireMfa,
  mcpWriteEnabled,
}: {
  initial: SettingsFormValues & { colorMode: ColorMode };
  publicRead: boolean;
  requireMfa: boolean;
  mcpWriteEnabled: boolean;
}) {
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
              <ColorModePicker initialMode={initial.colorMode} />
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
              <SwitchRow
                id="mcpWriteEnabled"
                name="mcpWriteEnabled"
                label="MCP からの書き込みを許可"
                description="オンにすると、「読み取り・書き込み」のアクセストークンを持つ AI クライアントが、ページやリンクの作成・更新をできるようになります。オフの間は、発行済みの書き込みトークンも読み取りしか使えません。"
                defaultChecked={mcpWriteEnabled}
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
