import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BookmarkActions } from "./BookmarkActions";

const meta = {
  title: "Components/BookmarkActions",
  component: BookmarkActions,
  tags: ["autodocs"],
  args: {
    bookmark: { id: 1, url: "https://github.com/", title: "GitHub", descriptionMd: "ソースコード・Issue管理", tags: ["開発"], faviconUrl: null },
    tagSuggestions: ["開発", "デザイン"],
    returnTo: "/bookmarks",
  },
  parameters: { docs: { description: { component: "リンク集の「⋯」メニュー。詳細・編集（ダイアログ）・削除（確認ダイアログ）。" } } },
} satisfies Meta<typeof BookmarkActions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** 詳細画面では「詳細」を出さない */
export const OnDetailPage: Story = { args: { showDetail: false } };
