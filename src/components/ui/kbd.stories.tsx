import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Kbd, KbdGroup } from "./kbd";

const meta = { title: "UI/Kbd", component: Kbd, tags: ["autodocs"], args: { children: "/" } } satisfies Meta<typeof Kbd>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Group: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>Ctrl</Kbd>
      <span>+</span>
      <Kbd>S</Kbd>
    </KbdGroup>
  ),
};
