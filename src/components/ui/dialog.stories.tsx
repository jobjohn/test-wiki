import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Input } from "./input";
import { Label } from "./label";

const meta = { title: "UI/Dialog", component: Dialog, tags: ["autodocs"] } satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const content = (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>リンクを追加</DialogTitle>
      <DialogDescription>URL を入力すると、サイトのタイトルを自動で取得します。</DialogDescription>
    </DialogHeader>
    <div className="grid gap-2">
      <Label htmlFor="dialog-url">URL</Label>
      <Input id="dialog-url" placeholder="https://example.com" />
    </div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">キャンセル</Button>
      </DialogClose>
      <Button>リンクを追加</Button>
    </DialogFooter>
  </DialogContent>
);

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>ダイアログを開く</Button>
      </DialogTrigger>
      {content}
    </Dialog>
  ),
};
/** 開いた状態で表示する（見た目の確認用） */
export const Open: Story = { render: () => <Dialog defaultOpen>{content}</Dialog> };
