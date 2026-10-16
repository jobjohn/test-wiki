import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Check, Info, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./alert";

const meta = {
  title: "UI/Alert",
  component: Alert,
  tags: ["autodocs"],
  argTypes: { variant: { control: "select", options: ["default", "destructive", "success", "warning"] } },
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Alert {...args}>
      <Info aria-hidden />
      <AlertTitle>お知らせ</AlertTitle>
      <AlertDescription>ホーム画面の上部に表示されます（Markdown 可）。</AlertDescription>
    </Alert>
  ),
};
export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden />
      <AlertDescription>
        <ul className="list-disc pl-4 text-destructive">
          <li>タイトルを入力してください</li>
          <li>同じタイトルのページが既にあります</li>
        </ul>
      </AlertDescription>
    </Alert>
  ),
};
export const Success: Story = {
  render: () => (
    <Alert variant="success">
      <Check aria-hidden />
      <AlertDescription>ページを更新しました。</AlertDescription>
    </Alert>
  ),
};
export const Warning: Story = {
  render: () => (
    <Alert variant="warning">
      <TriangleAlert aria-hidden />
      <AlertDescription className="text-foreground">この画面を離れると再表示できません。</AlertDescription>
    </Alert>
  ),
};
