import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Eye, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = { title: "UI/Tabs", component: Tabs, tags: ["autodocs"] } satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="write" className="max-w-md">
      <TabsList>
        <TabsTrigger value="write">
          <Pencil aria-hidden />
          編集
        </TabsTrigger>
        <TabsTrigger value="preview">
          <Eye aria-hidden />
          プレビュー
        </TabsTrigger>
      </TabsList>
      <TabsContent value="write">編集欄がここに入ります。</TabsContent>
      <TabsContent value="preview">プレビューがここに入ります。</TabsContent>
    </Tabs>
  ),
};
