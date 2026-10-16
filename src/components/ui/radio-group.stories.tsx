import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = { title: "UI/RadioGroup", component: RadioGroup, tags: ["autodocs"] } satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="system" aria-label="表示モード">
      {[
        ["system", "システムに合わせる"],
        ["light", "ライト"],
        ["dark", "ダーク"],
      ].map(([value, label]) => (
        <div key={value} className="flex items-center gap-2">
          <RadioGroupItem value={value} id={`mode-${value}`} />
          <Label htmlFor={`mode-${value}`}>{label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
};
