import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "保存" },
  argTypes: {
    variant: { control: "select", options: ["default", "destructive", "outline", "secondary", "ghost", "link", "highlight"] },
    size: { control: "select", options: ["default", "sm", "lg", "icon", "icon-sm"] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Destructive: Story = { args: { variant: "destructive", children: "削除する" } };
export const Outline: Story = { args: { variant: "outline", children: "キャンセル" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Link: Story = { args: { variant: "link" } };
export const Highlight: Story = { args: { variant: "highlight", children: "新規ページ" } };
export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <Plus aria-hidden />
      新規ページ
    </Button>
  ),
};
export const Loading: Story = {
  render: (args) => (
    <Button {...args} disabled>
      <Loader2 className="animate-spin" aria-hidden />
      保存中...
    </Button>
  ),
};
export const Disabled: Story = { args: { disabled: true } };
export const IconOnly: Story = {
  args: { variant: "ghost", size: "icon", "aria-label": "削除" },
  render: (args) => (
    <Button {...args}>
      <Trash2 aria-hidden />
    </Button>
  ),
};

/** すべての種類 × 大きさ。見た目を揃えるときの基準になる一覧 */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-4">
      {(["default", "destructive", "outline", "secondary", "ghost", "link", "highlight"] as const).map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-3">
          <code className="w-28 text-xs text-muted-foreground">{variant}</code>
          <Button variant={variant} size="sm">
            小
          </Button>
          <Button variant={variant}>
            標準 <ArrowRight aria-hidden />
          </Button>
          <Button variant={variant} size="lg">
            大
          </Button>
          <Button variant={variant} disabled>
            無効
          </Button>
        </div>
      ))}
    </div>
  ),
};
