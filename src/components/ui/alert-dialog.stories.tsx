import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./alert-dialog";
import { Button, buttonVariants } from "./button";

const meta = { title: "UI/AlertDialog", component: AlertDialog, tags: ["autodocs"] } satisfies Meta<typeof AlertDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Delete: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 aria-hidden />
          削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ページを削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>ページ「認証 API 仕様」を削除します。変更履歴も一緒に削除され、元に戻せません。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction className={buttonVariants({ variant: "destructive" })}>削除する</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
/** 開いた状態で表示する（見た目の確認用） */
export const Open: Story = {
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>第 2 版に戻しますか？</AlertDialogTitle>
          <AlertDialogDescription>この版の内容に戻します。現在の内容は履歴に残り、戻した内容が新しい版として保存されます。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction>この版に戻す</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
