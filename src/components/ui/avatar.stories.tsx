import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar, AvatarFallback } from "./avatar";

const meta = { title: "UI/Avatar", component: Avatar, tags: ["autodocs"] } satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Fallback: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar className="size-6">
        <AvatarFallback className="text-xs">W</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>W</AvatarFallback>
      </Avatar>
      <Avatar className="size-12">
        <AvatarFallback className="text-lg">山</AvatarFallback>
      </Avatar>
    </div>
  ),
};
