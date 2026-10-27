import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FolderBreadcrumbs, SimpleBreadcrumb } from "./Breadcrumbs";

const meta = { title: "Components/Breadcrumbs", component: FolderBreadcrumbs, tags: ["autodocs"] } satisfies Meta<typeof FolderBreadcrumbs>;
export default meta;
type Story = StoryObj<typeof meta>;

/** フォルダの階層（Storybook では「開発 > API」を親として表示する） */
export const Folder: Story = { args: { folder: { id: 3, name: "v1", parentId: 2, position: 0 } } };
export const FolderWithoutSelf: Story = { args: { folder: { id: 3, name: "v1", parentId: 2, position: 0 }, includeSelf: false } };
export const Simple: Story = {
  args: { folder: { id: 3, name: "v1", parentId: 2, position: 0 } },
  render: () => (
    <SimpleBreadcrumb
      items={[
        { href: "/pages/1", label: "認証 API 仕様" },
        { href: "/pages/1/revisions", label: "履歴" },
      ]}
    />
  ),
};
