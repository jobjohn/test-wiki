import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FolderPlus } from "lucide-react";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const meta = { title: "UI/Tooltip", component: Tooltip, tags: ["autodocs"] } satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip defaultOpen>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="新しいフォルダ">
          <FolderPlus aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>新しいフォルダ</TooltipContent>
    </Tooltip>
  ),
  decorators: [(Story) => <div className="pt-12 pl-12"><Story /></div>],
};
