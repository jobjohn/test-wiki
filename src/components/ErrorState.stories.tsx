import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ErrorState } from "./ErrorState";

const meta = {
  title: "Components/ErrorState",
  component: ErrorState,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "画面の描画中に例外が起きたときの表示（error.tsx / global-error.tsx）。サーバー側のエラーはエラー ID（digest）だけを見せる。" } } },
  args: { error: new Error("boom"), retry: fn() },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDigest: Story = {
  args: { error: Object.assign(new Error("hidden"), { digest: "1234567890" }) },
};
