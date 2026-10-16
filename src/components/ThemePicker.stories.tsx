import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemePicker } from "./ThemePicker";

const meta = {
  title: "Components/ThemePicker",
  component: ThemePicker,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "ベース・メイン・差し色の 3 色で全体の配色を決める。選ぶとすぐこの画面に反映される（保存はフォームの送信時）。" } } },
  args: { initialTheme: "standard", initialColors: { primaryColor: "#2563eb", secondaryColor: "#ffffff", accentColor: "#16a34a" }, initialMode: "system" },
} satisfies Meta<typeof ThemePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithDisplayMode: Story = { args: { showMode: true } };
export const Custom: Story = { args: { initialTheme: "custom", initialColors: { primaryColor: "#7c3aed", secondaryColor: "#ffffff", accentColor: "#ec4899" } } };
