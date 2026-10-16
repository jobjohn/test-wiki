import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Search, User } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./input-group";
import { Kbd } from "./kbd";

const meta = { title: "UI/InputGroup", component: InputGroup, tags: ["autodocs"] } satisfies Meta<typeof InputGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithIcon: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupInput placeholder="ユーザー名" aria-label="ユーザー名" />
      <InputGroupAddon>
        <User aria-hidden />
      </InputGroupAddon>
    </InputGroup>
  ),
};
export const Search_: Story = {
  name: "Search",
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupInput type="search" placeholder="検索" aria-label="Wiki を検索" />
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <Kbd>/</Kbd>
      </InputGroupAddon>
    </InputGroup>
  ),
};
