import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Pagination } from "./Pagination";

const meta = { title: "Components/Pagination", component: Pagination, tags: ["autodocs"], args: { basePath: "/changes" } } satisfies Meta<typeof Pagination>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = { args: { page: 1, hasNext: true } };
export const Middle: Story = { args: { page: 2, hasNext: true } };
export const LastPage: Story = { args: { page: 3, hasNext: false } };
export const SinglePage: Story = { args: { page: 1, hasNext: false }, parameters: { docs: { description: { story: "1 ページしかないときは何も表示しない。" } } } };
