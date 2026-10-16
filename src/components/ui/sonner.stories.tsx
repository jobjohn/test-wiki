import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { Button } from "./button";
import { Toaster } from "./sonner";

const meta = {
  title: "UI/Sonner（トースト通知）",
  component: Toaster,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "操作結果の通知。アプリ本体では `FlashBanner` が、サーバーアクションの結果を `toast.success` / `toast.error` で表示する。" } } },
} satisfies Meta<typeof Toaster>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Triggers: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="outline" onClick={() => toast.success("ページを更新しました。")}>
        成功
      </Button>
      <Button variant="outline" onClick={() => toast.error("保存できませんでした。")}>
        エラー
      </Button>
    </div>
  ),
};
