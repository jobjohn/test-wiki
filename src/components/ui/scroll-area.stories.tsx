import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ScrollArea } from "./scroll-area";

const meta = { title: "UI/ScrollArea", component: ScrollArea, tags: ["autodocs"] } satisfies Meta<typeof ScrollArea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-48 w-64 rounded-md border">
      <ul className="grid gap-2 p-3 text-sm">
        {Array.from({ length: 30 }, (_, i) => (
          <li key={i}>ページ {i + 1}</li>
        ))}
      </ul>
    </ScrollArea>
  ),
};
