import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoginForm } from "./LoginForm";

const meta = {
  title: "Forms/LoginForm",
  component: LoginForm,
  tags: ["autodocs"],
  args: { next: "" },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof LoginForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
