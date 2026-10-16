import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LogOut, Settings, User } from "lucide-react";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";

const meta = { title: "UI/DropdownMenu", component: DropdownMenu, tags: ["autodocs"] } satisfies Meta<typeof DropdownMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">メニュー</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Wiki 管理者</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User aria-hidden />
          アカウント
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings aria-hidden />
          Wiki の設定
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut aria-hidden />
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  decorators: [(Story) => <div className="min-h-64"><Story /></div>],
};
