"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SubmitButton } from "./SubmitButton";

/**
 * 確認ダイアログ（AlertDialog）を出してから、サーバーアクションを実行する（削除・復元など）。
 * trigger には、ダイアログを開くボタンを渡す。
 */
export function ConfirmAction({
  action,
  trigger,
  title,
  description,
  confirmLabel,
  destructive = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <form action={action}>
            <SubmitButton variant={destructive ? "destructive" : "default"} pendingText="処理中..." className="w-full sm:w-auto">
              {confirmLabel}
            </SubmitButton>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
