import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toc } from "./Toc";

const meta = { title: "Components/Toc", component: Toc, tags: ["autodocs"], args: { target: "#toc-sample" } } satisfies Meta<typeof Toc>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 見出しが 3 つ以上あるときだけ目次を表示する */
export const Default: Story = {
  render: (args) => (
    <div id="toc-sample" className="markdown-body overflow-hidden">
      <Toc {...args} />
      <h2 id="overview">概要</h2>
      <p>ログイン API の仕様です。</p>
      <h2 id="endpoint">エンドポイント</h2>
      <h3 id="login">POST /login</h3>
      <p>パスワードで認証します。</p>
    </div>
  ),
};
export const TooFewHeadings: Story = {
  render: (args) => (
    <div id="toc-sample" className="markdown-body">
      <Toc {...args} />
      <h2 id="overview">概要</h2>
      <p>見出しが少ないので、目次は表示されません。</p>
    </div>
  ),
};
