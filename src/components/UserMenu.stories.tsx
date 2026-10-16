import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserMenu } from "./UserMenu";

const meta = {
  title: "Components/UserMenu",
  component: UserMenu,
  tags: ["autodocs"],
  args: { name: "Wiki 管理者", username: "wikiadmin", roleName: "管理者", isAdmin: true },
  decorators: [(Story) => <div className="flex min-h-72 justify-end bg-header p-3 text-header-foreground"><Story /></div>],
} satisfies Meta<typeof UserMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Admin: Story = {};
export const Editor: Story = { args: { name: "山田 太郎", username: "yamada", roleName: "編集者", isAdmin: false } };
