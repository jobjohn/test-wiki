"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { saveFolderAction } from "@/actions/folders";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";
import { FOLDER_POSITION_PLACEHOLDER } from "@/lib/form";

export function FolderForm({
  folderId,
  initial,
  options,
  cancelHref,
}: {
  folderId: number | null;
  initial: { name: string; parentId: string; position: string };
  options: { id: number; label: string }[];
  cancelHref: string;
}) {
  const [state, action] = useActionState(saveFolderAction, {});
  const v = state.values ?? initial;
  return (
    <Card>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <FormErrors errors={state.errors} />
            {folderId !== null && <input type="hidden" name="id" value={folderId} />}
            <Field>
              <FieldLabel htmlFor="name">フォルダ名</FieldLabel>
              <Input id="name" name="name" defaultValue={v.name} required maxLength={100} autoFocus placeholder="例: 開発ドキュメント" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-[1fr_11rem]">
              <Field>
                <FieldLabel htmlFor="parentId">親フォルダ</FieldLabel>
                <NativeSelect id="parentId" name="parentId" defaultValue={v.parentId}>
                  <NativeSelectOption value="">（トップ）</NativeSelectOption>
                  {options.map((o) => (
                    <NativeSelectOption key={o.id} value={o.id}>
                      {o.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>フォルダの中にフォルダを入れて階層化できます。</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="position">表示順</FieldLabel>
                <Input type="number" id="position" name="position" step={1} defaultValue={v.position} placeholder={FOLDER_POSITION_PLACEHOLDER} />
                <FieldDescription>小さい数ほど先に並びます</FieldDescription>
              </Field>
            </div>
            <div className="flex gap-2">
              <SubmitButton pendingText="保存中...">
                <Save aria-hidden />
                保存
              </SubmitButton>
              <Button variant="outline" asChild>
                <Link href={cancelHref}>キャンセル</Link>
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
