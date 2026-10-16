import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CopyText } from "./CopyText";

const meta = { title: "Components/CopyText", component: CopyText, tags: ["autodocs"] } satisfies Meta<typeof CopyText>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { text: "![tiny.png](/files/1/tiny.png)" } };
export const WithDisplay: Story = { args: { text: "JBSWY3DPEHPK3PXP", display: "JBSW Y3DP EHPK 3PXP" } };
