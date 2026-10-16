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

export const New: Story = { args: { pageId: null, initial: { title: "", body: "", folderId: "", position: "0", tags: "", lockVersion: 0 } } };
export const Edit: Story = {
  args: {
    pageId: 3,
    initial: { title: "認証 API 仕様", body: "## 概要\n\nログイン API の仕様です。\n", folderId: "2", position: "0", tags: "API, 認証", lockVersion: 1 },
  },
};
