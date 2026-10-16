import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SetupForm } from "./SetupForm";

const initial = {
  wikiName: "Wiki",
  description: "",
};

const meta = {
  title: "Forms/SetupForm",
  component: SetupForm,
  tags: ["autodocs"],
  args: { initial, mustChangePassword: true, adminEmail: "admin@example.com" },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SetupForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FirstRun: Story = {};
export const WithoutPasswordChange: Story = { args: { mustChangePassword: false } };
