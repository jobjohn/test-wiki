"use client";

import { type ComponentProps, createContext, useContext, useTransition } from "react";

const PendingContext = createContext<boolean | null>(null);

/** ActionForm の中で送信中かどうか（SubmitButton が使う）。ActionForm の外では null */
export const useActionFormPending = () => useContext(PendingContext);

/**
 * サーバーアクションを呼ぶフォーム。<form action> と違い、実行後に React がフォームを自動リセットしない。
 * 自動リセットは Radix のラジオ・スイッチ・チェックボックスの内部状態を初期値に戻してしまい、
 * 入力エラーで再表示されたときに、選択済みの内容が消えてしまうため。
 */
export function ActionForm({ action, children, ...props }: Omit<ComponentProps<"form">, "action" | "onSubmit"> & { action: (formData: FormData) => void | Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <PendingContext value={pending}>
      <form
        {...props}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
          startTransition(async () => {
            await action(data);
          });
        }}
      >
        {children}
      </form>
    </PendingContext>
  );
}
