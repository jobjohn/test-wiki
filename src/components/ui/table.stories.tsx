import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

const meta = { title: "UI/Table", component: Table, tags: ["autodocs"] } satisfies Meta<typeof Table>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>日時</TableHead>
          <TableHead>ページ</TableHead>
          <TableHead>編集者</TableHead>
          <TableHead>要約</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[
          ["2026/09/30 14:09", "認証 API 仕様", "Wiki 管理者", "起動手順を追記"],
          ["2026/09/30 13:56", "Markdown の書き方", "Wiki 管理者", "初期ページ"],
        ].map((row) => (
          <TableRow key={row[0]}>
            {row.map((cell) => (
              <TableCell key={cell}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
