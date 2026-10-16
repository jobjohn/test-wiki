import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./input";
import { Label } from "./label";

const meta = { title: "UI/Label", component: Label, tags: ["autodocs"] } satisfies Meta<typeof Label>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithInput: Story = {
  render: () => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="title">タイトル</Label>
      <Input id="title" placeholder="ページタイトル" />
    </div>
  ),
};
