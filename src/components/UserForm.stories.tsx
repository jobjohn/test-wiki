import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserForm } from "./UserForm";

const meta = {
  title: "Forms/UserForm",
  component: UserForm,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UserForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const New: Story = {
  args: { userId: null, initial: { email: "", displayName: "", role: "general", status: "active", mustChangePassword: true } },
};
export const Edit: Story = {
  args: {
    userId: 2,
    initial: { email: "yamada@example.com", displayName: "山田 太郎", role: "general", status: "disabled", mustChangePassword: false },
  },
};
