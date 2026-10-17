import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SettingsForm } from "./SettingsForm";

const meta = {
  title: "Forms/SettingsForm",
  component: SettingsForm,
  tags: ["autodocs"],
  args: {
    publicRead: false,
    requireMfa: false,
    mcpWriteEnabled: false,
    initial: {
      wikiName: "開発チーム Wiki",
      description: "開発チームの **手順書・設計資料** をまとめる Wiki です。",
      colorMode: "system",
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingsForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const McpWriteEnabled: Story = { args: { mcpWriteEnabled: true } };
export const PublicAndMfaRequired: Story = { args: { publicRead: true, requireMfa: true } };
