import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Separator } from "./separator";

const meta = { title: "UI/Separator", component: Separator, tags: ["autodocs"] } satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="max-w-sm">
      <p>上</p>
      <Separator className="my-3" />
      <p>下</p>
    </div>
  ),
};
export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center gap-3 text-sm">
      <span>履歴</span>
      <Separator orientation="vertical" />
      <span>Markdown</span>
    </div>
  ),
};
