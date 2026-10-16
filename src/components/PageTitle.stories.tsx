import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilePlus } from "lucide-react";
import { PageTitle } from "./PageTitle";

const meta = { title: "Components/PageTitle", component: PageTitle, tags: ["autodocs"], args: { children: "認証 API 仕様" } } satisfies Meta<typeof PageTitle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithIcon: Story = { args: { icon: FilePlus, children: "新規ページ作成" } };
