"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { saveFolderAction } from "@/actions/folders";
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
    <form action={action} className="form-card">
      <FormErrors errors={state.errors} />
      {folderId !== null && <input type="hidden" name="id" value={folderId} />}
      <div className="field">
        <label htmlFor="name">フォルダ名</label>
        <input type="text" id="name" name="name" defaultValue={v.name} required maxLength={100} autoFocus placeholder="例: 開発ドキュメント" />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="parentId">親フォルダ</label>
          <select id="parentId" name="parentId" defaultValue={v.parentId}>
            <option value="">（トップ）</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="hint">フォルダの中にフォルダを入れて階層化できます。</p>
        </div>
        <div className="field field-narrow">
          <label htmlFor="position">表示順</label>
          <input type="number" id="position" name="position" step={1} defaultValue={v.position} />
        </div>
      </div>
      <div className="form-actions">
        <SubmitButton className="button button-primary" pendingText="保存中...">
          <Save size={18} aria-hidden />
          <span>保存</span>
        </SubmitButton>
        <Link href={cancelHref} className="button">
          キャンセル
        </Link>
      </div>
    </form>
  );
}
