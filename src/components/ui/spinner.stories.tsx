import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { Spinner } from "./spinner";

const meta = { title: "UI/Spinner", component: Spinner, tags: ["autodocs"] } satisfies Meta<typeof Spinner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const InButton: Story = {
  render: () => (
    <Button disabled>
      <Spinner aria-hidden />
      保存中...
    </Button>
  ),
};
