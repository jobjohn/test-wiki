import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MfaSetupForm } from "./MfaSetupForm";

// 本物の QR コードの代わりに、見た目確認用の市松模様を使う
const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><rect width="8" height="8" fill="#fff"/>${Array.from({ length: 64 }, (_, i) => ((i % 8) + Math.floor(i / 8)) % 2 === 0 || i % 5 === 0 ? `<rect x="${i % 8}" y="${Math.floor(i / 8)}" width="1" height="1"/>` : "").join("")}</svg>`;

const meta = {
  title: "Forms/MfaSetupForm",
  component: MfaSetupForm,
  tags: ["autodocs"],
  args: { secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", qrSvg },
} satisfies Meta<typeof MfaSetupForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
