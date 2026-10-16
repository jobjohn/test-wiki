import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageList } from "./PageList";

const page = (id: number, title: string, body: string) => ({
  id,
  title,
  body,
  folderId: null,
  position: 0,
  lockVersion: 0,
  createdAt: "2026-09-30T04:00:00.000Z",
  updatedAt: "2026-09-30T05:09:00.000Z",
});

const meta = {
  title: "Components/PageList",
  component: PageList,
  tags: ["autodocs"],
  args: { pages: [page(1, "認証 API 仕様", "ログイン API の仕様です。エンドポイントは POST /login です。"), page(2, "Markdown の書き方", "本文は GitHub 形式の Markdown で記述できます。"), page(3, "ホーム", "Wiki へようこそ。")] },
} satisfies Meta<typeof PageList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SearchResults: Story = { args: { query: "API 仕様" } };
