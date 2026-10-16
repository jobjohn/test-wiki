import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="must-change" {...args} />
      <Label htmlFor="must-change">次回ログイン時にパスワード変更を求める</Label>
    </div>
  ),
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };
