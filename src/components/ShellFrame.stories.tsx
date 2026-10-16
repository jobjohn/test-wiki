import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ShellFrame } from "./ShellFrame";
import type { TreeData } from "./Sidebar";

const tree: TreeData = {
  folders: [
    { id: 1, name: "ヘルプ", parentId: null },
    { id: 2, name: "開発", parentId: null },
  ],
  pages: [
    { id: 1, title: "ホーム", folderId: null },
    { id: 2, title: "Markdown の書き方", folderId: 1 },
  ],
};

const meta = {
  title: "Layout/ShellFrame",
  component: ShellFrame,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", nextjs: { navigation: { pathname: "/" } } },
  args: {
    wikiName: "開発チーム Wiki",
    tree,
    flash: null,
    user: { name: "Wiki 管理者", username: "wikiadmin", roleName: "管理者", isAdmin: true, canEdit: true },
    children: <p className="text-muted-foreground">ページの内容がここに入ります。</p>,
  },
} satisfies Meta<typeof ShellFrame>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Editor: Story = {};
export const Viewer: Story = { args: { user: { name: "閲覧 花子", username: "viewer1", roleName: "閲覧者", isAdmin: false, canEdit: false } } };
export const LoggedOut: Story = { args: { user: null } };
export const Mobile: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } };
