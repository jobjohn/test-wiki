import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageForm } from "./PageForm";

const folders = [
  { id: 1, label: "開発" },
  { id: 2, label: "開発 / API" },
];

const meta = {
  title: "Forms/PageForm",
  component: PageForm,
  tags: ["autodocs"],
  args: { folders, tagSuggestions: ["API", "認証", "手順書"], cancelHref: "/" },
} satisfies Meta<typeof PageForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const New: Story = { args: { pageId: null, initial: { title: "", body: "", folderId: "", position: "", tags: "", lockVersion: 0 } } };
export const Edit: Story = {
  args: {
    pageId: 3,
    initial: { title: "認証 API 仕様", body: "## 概要\n\nログイン API の仕様です。\n", folderId: "2", position: "", tags: "API, 認証", lockVersion: 1 },
  },
};
/** 表示順を指定したページ（空欄＝お任せ以外） */
export const WithPosition: Story = {
  args: {
    pageId: 3,
    initial: { title: "認証 API 仕様", body: "## 概要\n\nログイン API の仕様です。\n", folderId: "2", position: "2", tags: "API, 認証", lockVersion: 1 },
  },
};
