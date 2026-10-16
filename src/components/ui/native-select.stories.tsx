import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NativeSelect } from "./native-select";

const meta = {
  title: "UI/NativeSelect",
  component: NativeSelect,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "ブラウザ標準の `<select>` を shadcn/ui の見た目にしたもの。フォーム送信とスマートフォンでの操作性を優先して、独自のドロップダウンではなく標準の選択肢を使う。" } } },
  render: (args) => (
    <div className="w-72">
      <NativeSelect aria-label="フォルダ" {...args}>
        <option value="">（トップ）</option>
        <option value="1">開発</option>
        <option value="2">開発 / API</option>
      </NativeSelect>
    </div>
  ),
} satisfies Meta<typeof NativeSelect>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { "aria-invalid": true } };
