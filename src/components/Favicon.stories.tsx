import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Favicon } from "./Favicon";

/** 1x1 の緑色の PNG */
const SAMPLE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const meta = {
  title: "Components/Favicon",
  component: Favicon,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "リンク集のファビコン。画像がない・表示できないときは汎用のリンクアイコンになる。" } } },
} satisfies Meta<typeof Favicon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = { args: { src: SAMPLE } };
export const Fallback: Story = { args: { src: null } };
export const Broken: Story = { args: { src: "data:image/png;base64,AAAA" } };
