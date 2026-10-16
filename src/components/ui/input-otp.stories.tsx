import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp";

const slots = (
  <InputOTPGroup>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <InputOTPSlot key={i} index={i} />
    ))}
  </InputOTPGroup>
);

const meta = {
  title: "UI/InputOTP",
  component: InputOTP,
  tags: ["autodocs"],
  args: { maxLength: 6, "aria-label": "パスコード", children: slots },
} satisfies Meta<typeof InputOTP>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SixDigits: Story = {};
export const Filled: Story = { args: { value: "123456" } };
