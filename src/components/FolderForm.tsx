"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { saveFolderAction } from "@/actions/folders";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field } from "./Field";
import { FormErrors } from "./FormErrors";
import { SubmitButton } from "./SubmitButton";

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
        <form action={action} className="grid gap-5">
          <FormErrors errors={state.errors} />
          {folderId !== null && <input type="hidden" name="id" value={folderId} />}
          <Field label="フォルダ名" htmlFor="name">
            <Input id="name" name="name" defaultValue={v.name} required maxLength={100} autoFocus placeholder="例: 開発ドキュメント" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
            <Field label="親フォルダ" htmlFor="parentId" hint="フォルダの中にフォルダを入れて階層化できます。">
              <NativeSelect id="parentId" name="parentId" defaultValue={v.parentId}>
                <option value="">（トップ）</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="表示順" htmlFor="position">
              <Input type="number" id="position" name="position" step={1} defaultValue={v.position} />
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
        </form>
      </CardContent>
    </Card>
  );
}
