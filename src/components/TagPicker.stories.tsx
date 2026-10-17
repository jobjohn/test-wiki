import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { TagPicker } from "./TagPicker";

const meta = {
  title: "Forms/TagPicker",
  component: TagPicker,
  tags: ["autodocs"],
  args: { name: "tags", value: [], onChange: () => {}, suggestions: ["開発", "デザイン", "ツール", "API"] },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <TagPicker {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof TagPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Selected: Story = { args: { value: ["開発", "ツール"] } };
export const NoSuggestions: Story = { args: { suggestions: [] } };
