import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Markdown } from "./Markdown";

const SAMPLE = `## 概要

> ログイン API の仕様です。

## エンドポイント

| メソッド | パス |
| --- | --- |
| POST | \`/login\` |

\`\`\`ts
const x: number = 1;
\`\`\`

## 手順

- [x] 設計
- [ ] 実装

[[Markdown の書き方]] と [[まだない]] も参照。脚注もあります[^1]。

[^1]: これが脚注です。
`;

const meta = {
  title: "Components/Markdown",
  component: Markdown,
  tags: ["autodocs"],
  args: { source: SAMPLE },
  parameters: { docs: { description: { component: "Markdown 本文の表示。見出し・引用・表・コード（ハイライト付き）・チェックリスト・脚注・Wiki リンク（存在するページ／未作成のページ）の見た目を確認する。" } } },
} satisfies Meta<typeof Markdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SafeHtml: Story = {
  args: { source: '<script>alert(1)</script>\n\n[危険なリンク](javascript:alert(1))\n\n安全な文章だけが表示されます。' },
  parameters: { docs: { description: { story: "生の HTML と危険なリンクは出力されない。" } } },
};
