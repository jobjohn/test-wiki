"use client";

import { BookOpen, Palette, Save, ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import { saveSettingsAction } from "@/actions/settings";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm } from "./ActionForm";
import { Field } from "./Field";
import { FormErrors } from "./FormErrors";
import type { SettingsFormValues } from "./SetupForm";
import { SubmitButton } from "./SubmitButton";
import { ThemePicker } from "./ThemePicker";

function Section({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Icon className="size-[18px] text-primary" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}

function SwitchRow({ id, name, label, description, defaultChecked }: { id: string; name: string; label: string; description: string; defaultChecked: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="grid gap-1">
        <Label htmlFor={id} className="text-base">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} name={name} defaultChecked={defaultChecked} className="mt-1" />
    </div>
  );
}

export function SettingsForm({ initial, publicRead, requireMfa }: { initial: SettingsFormValues; publicRead: boolean; requireMfa: boolean }) {
  const [state, action] = useActionState(saveSettingsAction, {});
  const v = state.values;
  return (
    <Card>
      <CardContent>
        <ActionForm action={action} className="grid gap-6">
          <FormErrors errors={state.errors} />

          <Section icon={BookOpen} title="基本情報">
            <Field label="Wiki の名前" htmlFor="wikiName">
              <Input id="wikiName" name="wikiName" defaultValue={v?.wikiName ?? initial.wikiName} required maxLength={50} />
            </Field>
            <Field label="Wiki の説明" htmlFor="description" hint="ホーム画面の上部に表示されます（Markdown 可）。">
              <Textarea id="description" name="description" rows={3} defaultValue={v?.description ?? initial.description} />
            </Field>
          </Section>

          <Separator />
          <Section icon={Palette} title="見た目">
            <ThemePicker initialTheme={initial.theme} initialColors={initial.colors} initialMode={initial.colorMode} showMode />
          </Section>

          <Separator />
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
        </ActionForm>
      </CardContent>
    </Card>
  );
}
