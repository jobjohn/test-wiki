import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tag } from "lucide-react";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "バッジ" },
  argTypes: { variant: { control: "select", options: ["default", "secondary", "destructive", "outline", "highlight", "success"] } },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: "secondary", children: "編集者" } };
export const Destructive: Story = { args: { variant: "destructive", children: "削除" } };
export const Outline: Story = { args: { variant: "outline", children: "無効" } };
export const Highlight: Story = {
  args: { variant: "highlight" },
  render: (args) => (
    <Badge {...args}>
      <Tag aria-hidden />
      API
    </Badge>
  ),
};
export const Success: Story = { args: { variant: "success", children: "現在" } };
