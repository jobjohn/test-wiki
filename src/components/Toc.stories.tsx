import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toc } from "./Toc";

const items = [
  { id: "overview", text: "概要", level: 2 },
  { id: "endpoint", text: "エンドポイント", level: 2 },
  { id: "login", text: "POST /login", level: 3 },
];

const meta = {
  title: "Components/Toc",
  component: Toc,
  tags: ["autodocs"],
  args: { items },
  parameters: { docs: { description: { component: "サーバーで描画する目次。見出しが 3 つ未満なら何も出さない。狭い画面では折りたたみ、広い画面では sticky な右カラム。" } } },
} satisfies Meta<typeof Toc>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TooFewHeadings: Story = { args: { items: [{ id: "overview", text: "概要", level: 2 }] } };
