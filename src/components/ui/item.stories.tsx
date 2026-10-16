import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FileText, Folder } from "lucide-react";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "./item";

const meta = { title: "UI/Item", component: Item, tags: ["autodocs"] } satisfies Meta<typeof Item>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Outline: Story = {
  render: () => (
    <Item variant="outline" size="sm" className="max-w-sm" asChild>
      <a href="#">
        <ItemMedia variant="icon" className="text-highlight-text">
          <Folder aria-hidden />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>開発</ItemTitle>
          <ItemDescription className="text-xs">2 フォルダ・5 ページ</ItemDescription>
        </ItemContent>
      </a>
    </Item>
  ),
};
export const List: Story = {
  render: () => (
    <ItemGroup className="max-w-md">
      {["ホーム", "Markdown の書き方"].map((title, i) => (
        <div key={title}>
          {i > 0 && <ItemSeparator />}
          <Item size="sm">
            <ItemMedia variant="icon" className="text-muted-foreground">
              <FileText aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{title}</ItemTitle>
              <ItemDescription className="text-xs">2026/10/16 21:00</ItemDescription>
            </ItemContent>
          </Item>
        </div>
      ))}
    </ItemGroup>
  ),
};
