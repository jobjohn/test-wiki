import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Label } from "./label";
import { Switch } from "./switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
  render: (args) => (
    <div className="flex items-center gap-3">
      <Switch id="public-read" {...args} />
      <Label htmlFor="public-read">ログインなしで閲覧を許可</Label>
    </div>
  ),
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };
