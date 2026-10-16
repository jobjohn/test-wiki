import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ColorModePicker } from "./ColorModePicker";

const meta = {
  title: "Forms/ColorModePicker",
  component: ColorModePicker,
  tags: ["autodocs"],
  args: { initialMode: "system" },
} satisfies Meta<typeof ColorModePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const System: Story = {};
export const Dark: Story = { args: { initialMode: "dark" } };
