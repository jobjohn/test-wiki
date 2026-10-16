import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Save } from "lucide-react";
import { SubmitButton } from "./SubmitButton";

const meta = {
  title: "Components/SubmitButton",
  component: SubmitButton,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "フォーム送信ボタン。送信中は自動で無効化してスピナーを出し、二重送信を防ぐ。" } } },
} satisfies Meta<typeof SubmitButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { pendingText: "保存中...", children: <><Save aria-hidden />保存</> },
  render: (args) => (
    <form onSubmit={(e) => e.preventDefault()}>
      <SubmitButton {...args} />
    </form>
  ),
};
export const Disabled: Story = { args: { disabled: true, children: "有効にする" } };
