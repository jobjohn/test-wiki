import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserMenu } from "./UserMenu";

const meta = {
  title: "Components/UserMenu",
  component: UserMenu,
  tags: ["autodocs"],
  args: { name: "Wiki 管理者", email: "admin@example.com", roleName: "管理者", isAdmin: true },
  decorators: [
    (Story) => (
      <div className="flex min-h-72 justify-end p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UserMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Admin: Story = {};
export const General: Story = { args: { name: "山田 太郎", email: "yamada@example.com", roleName: "一般", isAdmin: false } };
