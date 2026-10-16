"use client";

import { RotateCcw, Save, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef } from "react";
import { changePasswordAction, disableMfaAction, regenerateBackupCodesAction, updateProfileAction } from "@/actions/account";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BackupCodes } from "./BackupCodes";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action] = useActionState(updateProfileAction, {});
  return (
    <form action={action}>
      <FieldGroup>
        <FormErrors errors={state.errors} />
        <Field>
          <FieldLabel htmlFor="displayName">表示名</FieldLabel>
          <div className="flex gap-2">
            <Input id="displayName" name="displayName" defaultValue={state.values?.displayName ?? displayName} maxLength={50} />
            <SubmitButton variant="outline" pendingText="保存中...">
              <Save aria-hidden />
              保存
            </SubmitButton>
          </div>
        </Field>
      </FieldGroup>
    </form>
  );
}

export function PasswordForm({ cancelable }: { cancelable: boolean }) {
  const [state, action] = useActionState(changePasswordAction, {});
  return (
    <Card className="max-w-lg">
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <FormErrors errors={state.errors} />
            <Field>
              <FieldLabel htmlFor="currentPassword">現在のパスワード</FieldLabel>
              <Input type="password" id="currentPassword" name="currentPassword" autoComplete="current-password" required autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">新しいパスワード（8 文字以上）</FieldLabel>
              <Input type="password" id="password" name="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="passwordConfirmation">新しいパスワード（確認）</FieldLabel>
              <Input type="password" id="passwordConfirmation" name="passwordConfirmation" autoComplete="new-password" minLength={8} required />
            </Field>
            <div className="flex gap-2">
              <SubmitButton pendingText="変更中...">
                <Save aria-hidden />
                変更する
              </SubmitButton>
              {cancelable && (
                <Button variant="outline" asChild>
                  <Link href="/account">キャンセル</Link>
                </Button>
              )}
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

/** 二段階認証が有効なときの操作（バックアップコードの再発行・無効化） */
export function MfaManage({ requireMfa }: { requireMfa: boolean }) {
  const [regen, regenAction] = useActionState(regenerateBackupCodesAction, {});
  const [disable, disableAction] = useActionState(disableMfaAction, {});
  const disableForm = useRef<HTMLFormElement>(null);
  if (regen.backupCodes) return <BackupCodes codes={regen.backupCodes} title="新しいバックアップコード" />;

  return (
    <div className="grid max-w-lg gap-3">
      <FormErrors errors={[...(regen.errors ?? []), ...(disable.errors ?? [])]} />
      <form action={regenAction} className="flex flex-col gap-2 sm:flex-row">
        <Input type="password" name="password" placeholder="パスワード" autoComplete="current-password" required aria-label="パスワード" />
        <SubmitButton variant="outline" pendingText="処理中...">
          <RotateCcw aria-hidden />
          バックアップコードを再発行
        </SubmitButton>
      </form>
      {!requireMfa && (
        <form ref={disableForm} action={disableAction} className="flex flex-col gap-2 sm:flex-row">
          <Input type="password" name="password" placeholder="パスワード" autoComplete="current-password" required aria-label="パスワード" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" className="text-destructive hover:text-destructive">
                <X aria-hidden />
                無効にする
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>二段階認証を無効にしますか？</AlertDialogTitle>
                <AlertDialogDescription>ログイン時にパスコードを求めなくなります。入力したパスワードで本人確認を行います。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => disableForm.current?.requestSubmit()} className={buttonVariants({ variant: "destructive" })}>
                  無効にする
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </form>
      )}
    </div>
  );
}
