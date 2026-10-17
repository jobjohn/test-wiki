import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookmarkDialog } from "./BookmarkDialog";

const meta = {
  title: "Forms/BookmarkDialog",
  component: BookmarkDialog,
  tags: ["autodocs"],
  args: { tagSuggestions: ["開発", "デザイン", "ツール"] },
  parameters: {
    docs: {
      description: {
        component: "リンクの追加・編集ダイアログ。URL の入力欄から離れると、タイトルを自動取得する（Storybook では example.com だけ取得に成功する）。",
      },
    },
  },
} satisfies Meta<typeof BookmarkDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const New: Story = {
  args: {
    trigger: (
      <Button>
        <Plus aria-hidden />
        リンクを追加
      </Button>
    ),
  },
};
/** 開いた状態（新規追加） */
export const OpenNew: Story = { args: { open: true } };
/** 開いた状態（編集） */
export const OpenEdit: Story = {
  args: {
    open: true,
    initial: { id: 1, url: "https://github.com/", title: "GitHub", descriptionMd: "ソースコード・Issue管理", tags: ["開発"], faviconUrl: null },
  },
};
