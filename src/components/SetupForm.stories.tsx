import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SetupForm } from "./SetupForm";

const initial = {
  wikiName: "Wiki",
  description: "",
  theme: "standard" as const,
  colors: { primaryColor: "#2563eb", secondaryColor: "#ffffff", accentColor: "#16a34a" },
  colorMode: "system" as const,
};

const meta = {
  title: "Forms/SetupForm",
  component: SetupForm,
  tags: ["autodocs"],
  args: { initial, mustChangePassword: true },
  decorators: [(Story) => <div className="max-w-3xl"><Story /></div>],
} satisfies Meta<typeof SetupForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FirstRun: Story = {};
export const WithoutPasswordChange: Story = { args: { mustChangePassword: false } };
