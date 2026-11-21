import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageActions } from "./PageActions";

const meta = {
  title: "Components/PageActions",
  component: PageActions,
  tags: ["autodocs"],
  args: { pageId: 3, title: "認証 API 仕様", editable: true },
  parameters: { docs: { description: { component: "記事の操作を「…」メニューにまとめたもの。編集・履歴・Markdown のダウンロード・ゴミ箱への移動。" } } },
} satisfies Meta<typeof PageActions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** 閲覧だけできる人には、編集とゴミ箱を出さない */
export const ReadOnly: Story = { args: { editable: false } };
