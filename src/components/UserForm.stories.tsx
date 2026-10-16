import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserForm } from "./UserForm";

const meta = {
  title: "Forms/UserForm",
  component: UserForm,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="max-w-2xl"><Story /></div>],
} satisfies Meta<typeof UserForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const New: Story = { args: { userId: null, initial: { username: "", displayName: "", role: "editor", mustChangePassword: true } } };
export const Edit: Story = { args: { userId: 2, initial: { username: "yamada", displayName: "山田 太郎", role: "viewer", mustChangePassword: false } } };
