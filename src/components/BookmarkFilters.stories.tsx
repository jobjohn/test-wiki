import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BookmarkFilters } from "./BookmarkFilters";

const meta = {
  title: "Components/BookmarkFilters",
  component: BookmarkFilters,
  tags: ["autodocs"],
  args: {
    q: "",
    tag: "",
    sort: "new",
    tags: [
      { id: 1, name: "開発" },
      { id: 2, name: "デザイン" },
      { id: 3, name: "ツール" },
    ],
    children: <p className="text-sm text-muted-foreground">（ここに一覧が入る）</p>,
  },
  parameters: { nextjs: { navigation: { pathname: "/bookmarks" } } },
} satisfies Meta<typeof BookmarkFilters>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filtered: Story = { args: { q: "next", tag: "開発", sort: "title" } };
export const NoTags: Story = { args: { tags: [] } };
