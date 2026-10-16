import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./input";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  args: { placeholder: "ページタイトル", "aria-label": "入力欄" },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: "認証 API 仕様" } };
export const Password: Story = { args: { type: "password", placeholder: "パスワード" } };
export const Number: Story = { args: { type: "number", defaultValue: 0 } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "編集できません" } };
export const Invalid: Story = { args: { "aria-invalid": true, defaultValue: "wikiadmin" } };
