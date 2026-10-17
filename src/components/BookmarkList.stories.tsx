import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BookmarkList, type BookmarkListItem } from "./BookmarkList";

const SAMPLE_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const bookmarks: BookmarkListItem[] = [
  {
    id: 1,
    title: "GitHub",
    url: "https://github.com/",
    descriptionMd: "ソースコード・**Issue** 管理",
    faviconUrl: SAMPLE_ICON,
    createdByName: "山田太郎",
    tags: [{ id: 1, name: "開発" }],
  },
  {
    id: 2,
    title: "Next.js Documentation",
    url: "https://nextjs.org/docs",
    descriptionMd: "Next.js 公式ドキュメント",
    faviconUrl: null,
    createdByName: "Wiki管理者",
    tags: [{ id: 1, name: "開発" }],
  },
  { id: 3, title: "Figma", url: "https://www.figma.com/", descriptionMd: "", faviconUrl: null, createdByName: null, tags: [{ id: 2, name: "デザイン" }] },
];

const meta = {
  title: "Components/BookmarkList",
  component: BookmarkList,
  tags: ["autodocs"],
  args: { bookmarks, tagSuggestions: ["開発", "デザイン"], returnTo: "/bookmarks", editable: true },
} satisfies Meta<typeof BookmarkList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ReadOnly: Story = { args: { editable: false } };
