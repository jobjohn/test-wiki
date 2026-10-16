import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const GROUPS: { title: string; note: string; tokens: [name: string, foreground: string][] }[] = [
  {
    title: "管理者が選ぶ 3 色",
    note: "設定画面で選んだ値が入る。ここを変えると、下のすべての色が連動して変わる。",
    tokens: [
      ["primary", "primary-foreground"],
      ["base", "base-foreground"],
      ["highlight", "highlight-foreground"],
    ],
  },
  {
    title: "面と文字",
    note: "ライト／ダークで切り替わる基本の色。",
    tokens: [
      ["background", "foreground"],
      ["card", "card-foreground"],
      ["popover", "popover-foreground"],
      ["muted", "muted-foreground"],
      ["secondary", "secondary-foreground"],
      ["accent", "accent-foreground"],
      ["sidebar", "sidebar-foreground"],
      ["header", "header-foreground"],
    ],
  },
  {
    title: "状態・補助",
    note: "操作の結果や、枠線・フォーカスに使う色。",
    tokens: [
      ["destructive", "background"],
      ["success", "background"],
      ["border", "foreground"],
      ["input", "foreground"],
      ["ring", "background"],
      ["link", "background"],
      ["highlight-text", "background"],
    ],
  },
];

function Swatch({ name, foreground }: { name: string; foreground: string }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex h-16 items-end p-2 text-sm font-medium" style={{ background: `var(--${name})`, color: `var(--${foreground})` }}>
        Aa 文字
      </div>
      <div className="grid gap-0.5 bg-card p-2">
        <code className="text-xs">--{name}</code>
        <code className="text-[11px] text-muted-foreground">on --{foreground}</code>
      </div>
    </div>
  );
}

function Colors() {
  return (
    <div className="grid gap-8">
      <p className="max-w-2xl text-sm text-muted-foreground">
        ツールバーの「カラーテーマ」「ライト／ダーク」を切り替えて、すべてのテーマで文字が読めること、色の役割が保たれていることを確認する。
      </p>
      {GROUPS.map((group) => (
        <section key={group.title} className="grid gap-3">
          <div>
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <p className="text-sm text-muted-foreground">{group.note}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.tokens.map(([name, foreground]) => (
              <Swatch key={name} name={name} foreground={foreground} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = { title: "Foundations/Colors", component: Colors, parameters: { layout: "padded" } } satisfies Meta<typeof Colors>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tokens: Story = {};
