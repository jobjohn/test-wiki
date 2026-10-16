import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Menu } from "lucide-react";
import { Button } from "./button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./sheet";

const meta = { title: "UI/Sheet", component: Sheet, tags: ["autodocs"], parameters: { layout: "fullscreen" } } satisfies Meta<typeof Sheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Left: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="メニュー" className="m-4">
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>メニュー</SheetTitle>
          <SheetDescription>ページとフォルダの一覧</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};
export const Right: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>右から開くパネル</SheetTitle>
          <SheetDescription>補足情報などに使えます。</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};
