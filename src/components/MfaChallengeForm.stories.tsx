import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MfaChallengeForm } from "./MfaChallengeForm";

const meta = {
  title: "Forms/MfaChallengeForm",
  component: MfaChallengeForm,
  tags: ["autodocs"],
  args: { next: "" },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof MfaChallengeForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
