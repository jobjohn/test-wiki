import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "@/components/ui/input";
import { Field } from "./Field";

const meta = { title: "Components/Field", component: Field, tags: ["autodocs"] } satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithHint: Story = {
  args: { label: "Wiki の説明", htmlFor: "description", hint: "ホーム画面の上部に表示されます（Markdown 可）。", children: <Input id="description" /> },
};
export const Plain: Story = { args: { label: "タイトル", htmlFor: "title", children: <Input id="title" /> } };
