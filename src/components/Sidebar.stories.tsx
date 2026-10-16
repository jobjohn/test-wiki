import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Sidebar, type TreeData } from "./Sidebar";

const tree: TreeData = {
  folders: [
    { id: 1, name: "ヘルプ", parentId: null },
    { id: 2, name: "開発", parentId: null },
    { id: 3, name: "API", parentId: 2 },
    { id: 4, name: "v1", parentId: 3 },
  ],
  pages: [
    { id: 1, title: "ホーム", folderId: null },
    { id: 2, title: "Markdown の書き方", folderId: 1 },
    { id: 3, title: "認証 API 仕様", folderId: 4 },
  ],
};

const meta = {
  title: "Components/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  args: { tree, canEdit: true },
  decorators: [(Story) => <div className="w-64 rounded-lg border bg-sidebar p-3"><Story /></div>],
} satisfies Meta<typeof Sidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { parameters: { nextjs: { navigation: { pathname: "/" } } } };
/** 現在のページを含むフォルダが開き、現在のページが強調される */
export const CurrentPage: Story = { parameters: { nextjs: { navigation: { pathname: "/pages/3" } } } };
export const ReadOnly: Story = { args: { canEdit: false }, parameters: { nextjs: { navigation: { pathname: "/pages/2" } } } };
export const Empty: Story = { args: { tree: { folders: [], pages: [] } } };
