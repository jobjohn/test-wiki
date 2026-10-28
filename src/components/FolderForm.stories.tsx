import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FolderForm } from "./FolderForm";

const options = [
  { id: 1, label: "開発" },
  { id: 2, label: "開発 / API" },
];

const meta = {
  title: "Forms/FolderForm",
  component: FolderForm,
  tags: ["autodocs"],
  args: { folderId: null, options, initial: { name: "", parentId: "", position: "" }, cancelHref: "/" },
  decorators: [(Story) => <div className="max-w-2xl"><Story /></div>],
} satisfies Meta<typeof FolderForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const New: Story = {};
export const Edit: Story = { args: { folderId: 2, initial: { name: "API", parentId: "1", position: "" } } };
/** 表示順を指定したフォルダ（空欄＝お任せ以外） */
export const WithPosition: Story = { args: { folderId: 2, initial: { name: "API", parentId: "1", position: "3" } } };
