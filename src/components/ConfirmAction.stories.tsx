import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "./ConfirmAction";

const meta = {
  title: "Components/ConfirmAction",
  component: ConfirmAction,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "確認ダイアログを出してから、サーバーアクションを実行する（削除・復元など）。" } } },
} satisfies Meta<typeof ConfirmAction>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = {
  args: {
    action: async () => {},
    title: "ページを削除しますか？",
    description: "ページ「認証 API 仕様」を削除します。変更履歴も一緒に削除され、元に戻せません。",
    confirmLabel: "削除する",
    destructive: true,
    trigger: (
      <Button variant="outline" className="text-destructive hover:text-destructive">
        <Trash2 aria-hidden />
        削除
      </Button>
    ),
  },
};
export const Normal: Story = {
  args: {
    action: async () => {},
    title: "第 2 版に戻しますか？",
    description: "この版の内容に戻します。戻した内容が新しい版として保存されます。",
    confirmLabel: "この版に戻す",
    trigger: <Button variant="outline">この版に戻す</Button>,
  },
};
