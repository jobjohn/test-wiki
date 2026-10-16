import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Folder, Upload } from "lucide-react";
import { Button } from "./button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty";

const meta = { title: "UI/Empty", component: Empty, tags: ["autodocs"] } satisfies Meta<typeof Empty>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Folder aria-hidden />
        </EmptyMedia>
        <EmptyTitle>このフォルダは空です</EmptyTitle>
      </EmptyHeader>
    </Empty>
  ),
};
export const WithAction: Story = {
  render: () => (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Upload aria-hidden />
        </EmptyMedia>
        <EmptyTitle>ファイルをアップロード</EmptyTitle>
        <EmptyDescription>ここにファイルをドラッグ＆ドロップするか、ボタンから選択してください。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>
          <Upload aria-hidden />
          ファイルを選択
        </Button>
      </EmptyContent>
    </Empty>
  ),
};
