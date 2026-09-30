"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { saveUserAction } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ROLES, type Role } from "@/lib/roles";
import { ActionForm } from "./ActionForm";
import { Field } from "./Field";
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
    <Card>
      <CardContent>
        <ActionForm action={action} className="grid gap-5">
          <FormErrors errors={state.errors} />
          {userId !== null && <input type="hidden" name="id" value={userId} />}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="ユーザー名" htmlFor="username" hint="半角英数字と _ . - で 3〜32 文字">
              <Input id="username" name="username" defaultValue={v.username} required autoCapitalize="none" placeholder="例: yamada" />
            </Field>
            <Field label="表示名" htmlFor="displayName">
              <Input id="displayName" name="displayName" defaultValue={v.displayName} placeholder="例: 山田 太郎" />
            </Field>
          </div>
          <Field label="権限" htmlFor="role">
            <NativeSelect id="role" name="role" defaultValue={v.role}>
              {(Object.entries(ROLES) as [Role, string][]).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={userId === null ? "初期パスワード" : "新しいパスワード（変更する場合のみ）"} htmlFor="password">
              <Input type="password" id="password" name="password" autoComplete="new-password" minLength={8} required={userId === null} />
            </Field>
            <Field label="パスワード（確認）" htmlFor="passwordConfirmation">
              <Input type="password" id="passwordConfirmation" name="passwordConfirmation" autoComplete="new-password" minLength={8} required={userId === null} />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="mustChangePassword" name="mustChangePassword" defaultChecked={state.values ? state.values.mustChangePassword === "on" : initial.mustChangePassword} />
            <Label htmlFor="mustChangePassword">次回ログイン時にパスワード変更を求める</Label>
          </div>
          <div className="flex gap-2">
            <SubmitButton pendingText="保存中...">
              <Save aria-hidden />
              保存
            </SubmitButton>
            <Button variant="outline" asChild>
              <Link href="/users">キャンセル</Link>
            </Button>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
