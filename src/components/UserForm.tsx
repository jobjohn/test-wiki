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
import { ROLES, STATUSES, type Role, type Status } from "@/lib/roles";
import { ActionForm } from "./ActionForm";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export function UserForm({
  userId,
  initial,
}: {
  userId: number | null;
  initial: { email: string; displayName: string; role: Role; status: Status; mustChangePassword: boolean };
}) {
  const [state, action] = useActionState(saveUserAction, {});
  const v = state.values ?? { email: initial.email, displayName: initial.displayName, role: initial.role, status: initial.status };
  return (
    <Card>
      <CardContent>
        <ActionForm action={action}>
          <FieldGroup>
            <FormErrors errors={state.errors} />
            {userId !== null && <input type="hidden" name="id" value={userId} />}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="email">メールアドレス</FieldLabel>
                <Input type="email" id="email" name="email" defaultValue={v.email} required autoComplete="off" placeholder="例: yamada@example.com" />
                <FieldDescription>ログインに使います</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="displayName">表示名</FieldLabel>
                <Input id="displayName" name="displayName" defaultValue={v.displayName} placeholder="例: 山田 太郎" />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="role">ロール</FieldLabel>
                <NativeSelect id="role" name="role" defaultValue={v.role}>
                  {(Object.entries(ROLES) as [Role, string][]).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
                <FieldDescription>一般: ページの閲覧・編集 ／ 管理者: 管理者設定（ユーザー管理）と一般設定も可能</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="status">ステータス</FieldLabel>
                <NativeSelect id="status" name="status" defaultValue={v.status}>
                  {(Object.entries(STATUSES) as [Status, string][]).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
                <FieldDescription>無効にすると、ログインできなくなります（ログイン中の端末からもログアウトします）</FieldDescription>
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="password">{userId === null ? "初期パスワード" : "新しいパスワード（変更する場合のみ）"}</FieldLabel>
                <Input type="password" id="password" name="password" autoComplete="new-password" minLength={8} required={userId === null} />
              </Field>
              <Field>
                <FieldLabel htmlFor="passwordConfirmation">パスワード（確認）</FieldLabel>
                <Input
                  type="password"
                  id="passwordConfirmation"
                  name="passwordConfirmation"
                  autoComplete="new-password"
                  minLength={8}
                  required={userId === null}
                />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="mustChangePassword"
                name="mustChangePassword"
                defaultChecked={state.values ? state.values.mustChangePassword === "on" : initial.mustChangePassword}
              />
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
          </FieldGroup>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
