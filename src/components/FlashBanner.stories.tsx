import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FlashBanner } from "./FlashBanner";

const meta = {
  title: "Components/FlashBanner",
  component: FlashBanner,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "サーバーアクションの結果（Cookie に保存した 1 回限りのメッセージ）を、トースト通知で表示する。" } } },
} satisfies Meta<typeof FlashBanner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Notice: Story = { args: { flash: { id: "n1", type: "notice", message: "ページ「認証 API 仕様」を作成しました。" } } };
export const Alert: Story = { args: { flash: { id: "a1", type: "alert", message: "ページが見つかりません（削除された可能性があります）。" } } };
