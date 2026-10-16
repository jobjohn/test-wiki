import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const SAMPLES: [label: string, className: string, text: string][] = [
  ["ページタイトル", "text-2xl font-bold tracking-tight", "認証 API 仕様"],
  ["セクション見出し", "text-lg font-semibold", "どんな Wiki ですか？"],
  ["カード見出し", "font-semibold", "最近更新されたページ"],
  ["本文", "", "Wiki へようこそ。このページは自由に編集できます。"],
  ["補足", "text-sm text-muted-foreground", "ホーム画面の上部に表示されます（Markdown 可）。"],
  ["注記", "text-xs text-muted-foreground", "Ctrl/⌘ + S で保存"],
  ["コード", "font-mono text-sm", "docker compose up -d"],
];

function Typography() {
  return (
    <div className="grid max-w-3xl gap-4">
      <p className="text-sm text-muted-foreground">画面で使っている文字の大きさと太さ。新しい画面では、ここにある種類だけを使う。</p>
      {SAMPLES.map(([label, className, text]) => (
        <div key={label} className="grid grid-cols-[8rem_1fr] items-baseline gap-4 border-b pb-3">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={className}>{text}</span>
        </div>
      ))}
    </div>
  );
}

const meta = { title: "Foundations/Typography", component: Typography } satisfies Meta<typeof Typography>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = {};
