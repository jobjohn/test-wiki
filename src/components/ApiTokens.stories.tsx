import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ApiTokenForm, ApiTokenList, McpGuide } from "./ApiTokens";

const meta = {
  title: "Forms/ApiTokens",
  component: ApiTokenList,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ApiTokenList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = {
  args: {
    tokens: [
      { id: 1, name: "ノート PC の Claude Code", prefix: "wiki_aB3d", scope: "読み取り", createdAt: "2026/10/01 10:00", lastUsedAt: "2026/10/16 18:30", expiresAt: "2026/12/30 10:00", expired: false },
      { id: 2, name: "検証用", prefix: "wiki_Zx9k", scope: "読み取り", createdAt: "2026/05/01 09:00", lastUsedAt: null, expiresAt: null, expired: false },
      { id: 4, name: "書き込み用", prefix: "wiki_Wr1t", scope: "読み取り・書き込み", createdAt: "2026/10/10 10:00", lastUsedAt: null, expiresAt: "2027/01/08 10:00", expired: false },
      { id: 5, name: "書き込み用（設定で無効）", prefix: "wiki_Wr2t", scope: "読み取り・書き込み", writeInactive: true, createdAt: "2026/10/10 10:00", lastUsedAt: null, expiresAt: "2027/01/08 10:00", expired: false },
      { id: 3, name: "古いトークン", prefix: "wiki_Qq7m", scope: "読み取り", createdAt: "2026/01/01 09:00", lastUsedAt: "2026/02/01 09:00", expiresAt: "2026/04/01 09:00", expired: true },
    ],
  },
};
export const Empty: Story = { args: { tokens: [] } };
export const Form: Story = { args: { tokens: [] }, render: () => <ApiTokenForm origin="https://wiki.example.com" /> };
export const FormWriteEnabled: Story = { args: { tokens: [] }, render: () => <ApiTokenForm origin="https://wiki.example.com" writeEnabled /> };
export const GuideWriteEnabled: Story = { args: { tokens: [] }, render: () => <McpGuide origin="https://wiki.example.com" writeEnabled /> };
export const Guide: Story = { args: { tokens: [] }, render: () => <McpGuide origin="https://wiki.example.com" /> };
