"use client";

import type { ReactNode } from "react";
import { SubmitButton } from "./SubmitButton";

/** 確認ダイアログを出してからサーバーアクションを実行するボタン（削除など） */
export function ConfirmButton({
  action,
  message,
  className = "button",
  title,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      className="inline"
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <SubmitButton className={className} title={title} aria-label={title}>
        {children}
      </SubmitButton>
    </form>
  );
}
