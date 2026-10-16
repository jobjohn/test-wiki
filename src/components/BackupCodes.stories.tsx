import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BackupCodes } from "./BackupCodes";

const meta = {
  title: "Components/BackupCodes",
  component: BackupCodes,
  tags: ["autodocs"],
  args: { codes: ["q89fk-pbef6", "zeduy-y84qm", "pt69h-9q2r2", "edtk6-hkxcc", "as2r2-e53td", "sqvck-t93mc", "pyh8w-vqfxw", "x7mq5-weqf6", "9rdch-eg48b", "gwkau-ar44g"] },
} satisfies Meta<typeof BackupCodes>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Regenerated: Story = { args: { title: "新しいバックアップコード" } };
